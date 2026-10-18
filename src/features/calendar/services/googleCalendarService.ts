import {
  clearGoogleAccessToken,
  getGoogleAccessToken,
} from './googleTokenService';

const GOOGLE_CALENDAR_SCOPE =
  'https://www.googleapis.com/auth/calendar';

export type GoogleUserInfo = {
  email: string;
  name?: string;
  picture?: string;
};

type GoogleTokenInfo = {
  scope?: string;
};

type GoogleCalendarUpdateResponse = {
  updated?: string;
};

export interface GoogleCalendarEventUpdate {
  title: string;
  startAt: string;
  endAt: string;
  location?: string;
  description?: string;
}

export interface GoogleCalendarEventUpdateResult {
  updatedAt?: string;
}

export async function getGoogleUserInfo(
  accessToken: string,
): Promise<GoogleUserInfo> {
  const response = await fetch(
    'https://openidconnect.googleapis.com/v1/userinfo',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      'Could not load Google account information.',
    );
  }

  const data = await response.json();

  return {
    email: data.email,
    name: data.name,
    picture: data.picture,
  };
}

export async function hasGoogleCalendarAccess(
  accessToken: string,
): Promise<boolean> {
  const response = await fetch(
    `https://www.googleapis.com/oauth2/v2/tokeninfo?access_token=${encodeURIComponent(
      accessToken,
    )}`,
  );

  if (!response.ok) {
    throw new Error(
      'Could not verify Google Calendar permissions.',
    );
  }

  const data: GoogleTokenInfo =
    await response.json();

  const grantedScopes =
    data.scope
      ?.split(' ')
      .filter(Boolean) ?? [];

  return grantedScopes.includes(
    GOOGLE_CALENDAR_SCOPE,
  );
}

/**
 * Updates an existing event in Google Calendar.
 *
 * The event and calendar IDs come from the calendar_event_links
 * record associated with the RISE event.
 *
 * Google returns its own modification timestamp after a successful
 * update. RISE stores that timestamp with the event link so later
 * synchronization can determine whether Google changed independently.
 */
export async function updateGoogleCalendarEvent(
  externalEventId: string,
  externalCalendarId: string,
  updates: GoogleCalendarEventUpdate,
): Promise<GoogleCalendarEventUpdateResult> {
  if (!externalEventId) {
    throw new Error(
      'GOOGLE_EVENT_ID_MISSING',
    );
  }

  if (!externalCalendarId) {
    throw new Error(
      'GOOGLE_CALENDAR_ID_MISSING',
    );
  }

  const accessToken =
    await getGoogleAccessToken();

  if (!accessToken) {
    throw new Error(
      'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
    );
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      externalCalendarId,
    )}/events/${encodeURIComponent(
      externalEventId,
    )}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: updates.title,
        start: {
          dateTime: updates.startAt,
        },
        end: {
          dateTime: updates.endAt,
        },
        location:
          updates.location?.trim() ?? '',
        description:
          updates.description?.trim() ?? '',
      }),
    },
  );

  if (response.status === 401) {
    await clearGoogleAccessToken();

    throw new Error(
      'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
    );
  }

  if (response.status === 404) {
    throw new Error(
      'GOOGLE_EVENT_NOT_FOUND',
    );
  }

  if (!response.ok) {
    throw new Error(
      'GOOGLE_CALENDAR_UPDATE_FAILED',
    );
  }

  const data:
    GoogleCalendarUpdateResponse =
    await response.json();

  return {
    updatedAt:
      data.updated,
  };
}
export interface GoogleCalendarEventCreate {
  title: string;
  startAt: string;
  endAt: string;
  location?: string;
  description?: string;
  /** Minutes before the start to notify the student, e.g. 1440 for 1 day. */
  reminderMinutes?: number;
}

export interface GoogleCalendarEventCreateResult {
  externalEventId: string;
  /** The real calendar ID (usually the student's email), as the import uses it. */
  externalCalendarId: string;
  updatedAt?: string;
}

type GoogleCalendarResponse = {
  id?: string;
};

type GoogleCalendarEventCreateResponse = {
  id?: string;
  updated?: string;
};

/**
 * Adds an event the student made in RISE to their main Google Calendar (#123).
 *
 * The import keys Google events by calendar ID + event ID, using each
 * calendar's real ID. The main calendar's real ID is looked up first and
 * used for the event, so the next import recognizes the event through its
 * link instead of importing it again as a duplicate.
 */
export async function createGoogleCalendarEvent(
  event: GoogleCalendarEventCreate,
): Promise<GoogleCalendarEventCreateResult> {
  const accessToken =
    await getGoogleAccessToken();

  if (!accessToken) {
    throw new Error(
      'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
    );
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const calendarResponse = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary',
    {
      headers,
    },
  );

  if (calendarResponse.status === 401) {
    await clearGoogleAccessToken();

    throw new Error(
      'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
    );
  }

  if (!calendarResponse.ok) {
    throw new Error(
      'GOOGLE_CALENDAR_CREATE_FAILED',
    );
  }

  const calendar: GoogleCalendarResponse =
    await calendarResponse.json();

  if (!calendar.id) {
    throw new Error(
      'GOOGLE_CALENDAR_ID_MISSING',
    );
  }

  const eventResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendar.id,
    )}/events`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        summary: event.title,
        start: {
          dateTime: event.startAt,
        },
        end: {
          dateTime: event.endAt,
        },
        location:
          event.location?.trim() || undefined,
        description:
          event.description?.trim() || undefined,
        // A chosen RISE reminder becomes a Google notification; otherwise the
        // calendar's own default notifications apply.
        reminders:
          event.reminderMinutes
            ? {
                useDefault: false,
                overrides: [
                  {
                    method: 'popup',
                    minutes: event.reminderMinutes,
                  },
                ],
              }
            : {
                useDefault: true,
              },
      }),
    },
  );

  if (eventResponse.status === 401) {
    await clearGoogleAccessToken();

    throw new Error(
      'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
    );
  }

  if (!eventResponse.ok) {
    throw new Error(
      'GOOGLE_CALENDAR_CREATE_FAILED',
    );
  }

  const created: GoogleCalendarEventCreateResponse =
    await eventResponse.json();

  if (!created.id) {
    throw new Error(
      'GOOGLE_CALENDAR_CREATE_FAILED',
    );
  }

  return {
    externalEventId: created.id,
    externalCalendarId: calendar.id,
    updatedAt: created.updated,
  };
}

/**
 * Deletes an event from Google Calendar, so the next sync doesn't
 * import it into RISE again. Used to remove a new copy RISE couldn't
 * link (#123).
 *
 * An event that is already gone from Google counts as deleted.
 */
export async function deleteGoogleCalendarEvent(
  externalEventId: string,
  externalCalendarId: string,
): Promise<void> {
  if (!externalEventId) {
    throw new Error(
      'GOOGLE_EVENT_ID_MISSING',
    );
  }

  if (!externalCalendarId) {
    throw new Error(
      'GOOGLE_CALENDAR_ID_MISSING',
    );
  }

  const accessToken =
    await getGoogleAccessToken();

  if (!accessToken) {
    throw new Error(
      'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
    );
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      externalCalendarId,
    )}/events/${encodeURIComponent(
      externalEventId,
    )}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (response.status === 401) {
    await clearGoogleAccessToken();

    throw new Error(
      'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
    );
  }

  // 404: no such event; 410: already deleted.
  if (
    response.status === 404 ||
    response.status === 410
  ) {
    return;
  }

  if (!response.ok) {
    throw new Error(
      'GOOGLE_CALENDAR_DELETE_FAILED',
    );
  }
}
