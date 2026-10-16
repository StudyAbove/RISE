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