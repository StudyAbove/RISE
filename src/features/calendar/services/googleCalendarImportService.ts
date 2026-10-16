import {
  createImportedCalendarEvent,
  getCalendarEventsByIdsForSync,
  updateCalendarEvent,
} from '../../../repositories/calendarEventsRepository';

import {
  getCalendarEventLinksByProvider,
  markCalendarEventLinkSynced,
  saveCalendarEventLink,
} from '../../../repositories/calendarEventLinksRepository';

import type {
  CalendarEventLink,
} from '../../../models/CalendarEventLink';

import {
  clearGoogleAccessToken,
  getGoogleAccessToken,
} from './googleTokenService';

import {
  updateGoogleCalendarEvent,
} from './googleCalendarService';

import {
  getAcademicTermRange,
} from '../utils/academicTermRange';

type GoogleCalendarListEntry = {
  id?: string;
  summary?: string;
  selected?: boolean;
  hidden?: boolean;
  deleted?: boolean;
};

type GoogleCalendarListResponse = {
  items?: GoogleCalendarListEntry[];
  nextPageToken?: string;
};

type GoogleEventDateTime = {
  dateTime?: string;
  date?: string;
  timeZone?: string;
};

type GoogleCalendarEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  updated?: string;
};

type GoogleEventsResponse = {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
};

interface GoogleCalendarCandidate {
  calendarId: string;
  eventId: string;
  title: string;
  startAt: string;
  endAt: string;
  location?: string;
  description?: string;
  updatedAt?: string;
}

export interface GoogleCalendarBulkSyncResult {
  imported: number;
  skipped: number;
  failed: number;
  total: number;
}

function normalizeOptionalText(
  value?: string,
) {
  return value?.trim() || undefined;
}

function sameInstant(
  first: string,
  second: string,
) {
  return (
    new Date(first).getTime() ===
    new Date(second).getTime()
  );
}

function sameCalendarEvent(
  candidate: GoogleCalendarCandidate,
  riseEvent: {
    title: string;
    startAt: string;
    endAt: string;
    location?: string;
    description?: string;
  },
) {
  return (
    candidate.title ===
      riseEvent.title &&
    sameInstant(
      candidate.startAt,
      riseEvent.startAt,
    ) &&
    sameInstant(
      candidate.endAt,
      riseEvent.endAt,
    ) &&
    normalizeOptionalText(
      candidate.location,
    ) ===
      normalizeOptionalText(
        riseEvent.location,
      ) &&
    normalizeOptionalText(
      candidate.description,
    ) ===
      normalizeOptionalText(
        riseEvent.description,
      )
  );
}

function riseChangedSinceLastSync(
  riseUpdatedAt?: string,
  lastSyncedAt?: string,
) {
  if (
    !riseUpdatedAt ||
    !lastSyncedAt
  ) {
    return false;
  }

  return (
    new Date(
      riseUpdatedAt,
    ).getTime() >
    new Date(
      lastSyncedAt,
    ).getTime()
  );
}

/**
 * Returns whether Google changed after the provider timestamp
 * stored during the previous successful synchronization.
 *
 * null means no provider baseline exists yet, so RISE cannot
 * safely determine whether Google changed independently.
 */
function googleChangedSinceLastSync(
  candidate: GoogleCalendarCandidate,
  link: CalendarEventLink,
): boolean | null {
  if (
    !candidate.updatedAt ||
    !link.externalUpdatedAt
  ) {
    return null;
  }

  const currentGoogleUpdatedAt =
    new Date(
      candidate.updatedAt,
    ).getTime();

  const previousGoogleUpdatedAt =
    new Date(
      link.externalUpdatedAt,
    ).getTime();

  if (
    Number.isNaN(
      currentGoogleUpdatedAt,
    ) ||
    Number.isNaN(
      previousGoogleUpdatedAt,
    )
  ) {
    return null;
  }

  return (
    currentGoogleUpdatedAt >
    previousGoogleUpdatedAt
  );
}

function getGoogleDateValue(
  value?: GoogleEventDateTime,
): string | null {
  if (value?.dateTime) {
    const parsed =
      new Date(
        value.dateTime,
      );

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return null;
    }

    return parsed.toISOString();
  }

  /*
   * Google represents all-day events with a YYYY-MM-DD value
   * instead of dateTime. Creating the Date at local midnight
   * keeps the event on the intended calendar day in RISE.
   */
  if (value?.date) {
    const [
      year,
      month,
      day,
    ] =
      value.date
        .split('-')
        .map(Number);

    if (
      !year ||
      !month ||
      !day
    ) {
      return null;
    }

    return new Date(
      year,
      month - 1,
      day,
      0,
      0,
      0,
      0,
    ).toISOString();
  }

  return null;
}

async function googleFetch(
  url: string,
  accessToken: string,
) {
  const response =
    await fetch(
      url,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      },
    );

  if (
    response.status ===
    401
  ) {
    await clearGoogleAccessToken();

    throw new Error(
      'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
    );
  }

  if (!response.ok) {
    throw new Error(
      'GOOGLE_CALENDAR_SYNC_FAILED',
    );
  }

  return response;
}

async function getGoogleCalendars(
  accessToken: string,
) {
  const calendars:
    GoogleCalendarListEntry[] =
    [];

  let pageToken:
    string | undefined;

  do {
    const query =
      new URLSearchParams({
        maxResults:
          '250',
      });

    if (pageToken) {
      query.set(
        'pageToken',
        pageToken,
      );
    }

    const response =
      await googleFetch(
        `https://www.googleapis.com/calendar/v3/users/me/calendarList?${query.toString()}`,
        accessToken,
      );

    const data:
      GoogleCalendarListResponse =
      await response.json();

    calendars.push(
      ...(data.items ?? []),
    );

    pageToken =
      data.nextPageToken;
  } while (pageToken);

  /*
   * Only calendars currently visible/selected in the student's
   * Google Calendar are imported into RISE.
   */
  return calendars.filter(
    (calendar) =>
      Boolean(
        calendar.id,
      ) &&
      !calendar.deleted &&
      !calendar.hidden &&
      calendar.selected !==
        false,
  );
}

async function getGoogleEventsForCalendar(
  accessToken: string,
  calendarId: string,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const events:
    GoogleCalendarEvent[] =
    [];

  let pageToken:
    string | undefined;

  do {
    const query =
      new URLSearchParams({
        timeMin:
          rangeStart.toISOString(),

        timeMax:
          rangeEnd.toISOString(),

        singleEvents:
          'true',

        orderBy:
          'startTime',

        maxResults:
          '2500',
      });

    if (pageToken) {
      query.set(
        'pageToken',
        pageToken,
      );
    }

    const response =
      await googleFetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          calendarId,
        )}/events?${query.toString()}`,
        accessToken,
      );

    const data:
      GoogleEventsResponse =
      await response.json();

    events.push(
      ...(data.items ?? []),
    );

    pageToken =
      data.nextPageToken;
  } while (pageToken);

  return events;
}

function toGoogleCalendarCandidate(
  calendarId: string,
  event: GoogleCalendarEvent,
): GoogleCalendarCandidate | null {
  if (
    !event.id ||
    event.status ===
      'cancelled'
  ) {
    return null;
  }

  const startAt =
    getGoogleDateValue(
      event.start,
    );

  const endAt =
    getGoogleDateValue(
      event.end,
    );

  if (
    !startAt ||
    !endAt
  ) {
    return null;
  }

  return {
    calendarId,

    eventId:
      event.id,

    title:
      event.summary?.trim() ||
      'Untitled event',

    startAt,

    endAt,

    location:
      normalizeOptionalText(
        event.location,
      ),

    description:
      normalizeOptionalText(
        event.description,
      ),

    updatedAt:
      event.updated,
  };
}

async function getGoogleCalendarEvents(
  accessToken: string,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const calendars =
    await getGoogleCalendars(
      accessToken,
    );

  const candidates:
    GoogleCalendarCandidate[] =
    [];

  for (
    const calendar
    of calendars
  ) {
    if (!calendar.id) {
      continue;
    }

    const events =
      await getGoogleEventsForCalendar(
        accessToken,
        calendar.id,
        rangeStart,
        rangeEnd,
      );

    for (
      const event
      of events
    ) {
      const candidate =
        toGoogleCalendarCandidate(
          calendar.id,
          event,
        );

      if (candidate) {
        candidates.push(
          candidate,
        );
      }
    }
  }

  return candidates;
}

/**
 * Imports and synchronizes Google Calendar events for the
 * current academic-term range.
 *
 * New Google events are inserted into RISE and linked using
 * their Google event ID and Google calendar ID.
 *
 * For an already-linked event, RISE tracks both its own last
 * successful sync time and Google's provider modification time.
 *
 * If only Google changed, Google is pulled into RISE.
 * If only RISE changed, RISE is pushed back to Google.
 * If both changed, neither copy is overwritten automatically.
 * Story #85 will provide conflict resolution for that case.
 */
export async function syncGoogleCalendarEvents(
  date: Date = new Date(),
): Promise<GoogleCalendarBulkSyncResult> {
  const accessToken =
    await getGoogleAccessToken();

  if (!accessToken) {
    throw new Error(
      'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
    );
  }

  const {
    start,
    end,
  } =
    getAcademicTermRange(
      date,
    );

  const candidates =
    await getGoogleCalendarEvents(
      accessToken,
      start,
      end,
    );

  const links =
    await getCalendarEventLinksByProvider(
      'google',
    );

  /*
   * Google event IDs belong to a calendar, so use both IDs
   * as the lookup key instead of assuming the event ID alone
   * identifies the linked event.
   */
  const linksByExternalEvent =
    new Map(
      links.map(
        (link) => [
          `${link.externalCalendarId ?? ''}|${link.externalEventId}`,
          link,
        ],
      ),
    );

  const linkedEventIds =
    links.map(
      (link) =>
        link.calendarEventId,
    );

  const riseEvents =
    await getCalendarEventsByIdsForSync(
      linkedEventIds,
    );

  const riseEventsById =
    new Map(
      riseEvents.map(
        (event) => [
          event.id,
          event,
        ],
      ),
    );

  let imported =
    0;

  let skipped =
    0;

  let failed =
    0;

  for (
    const candidate
    of candidates
  ) {
    const key =
      `${candidate.calendarId}|${candidate.eventId}`;

    const link =
      linksByExternalEvent.get(
        key,
      );

    /*
     * This Google event has never been imported into RISE.
     */
    if (!link) {
      try {
        const createdEvent =
          await createImportedCalendarEvent(
            {
              title:
                candidate.title,

              startAt:
                candidate.startAt,

              endAt:
                candidate.endAt,

              source:
                'google',

              location:
                candidate.location,

              description:
                candidate.description,
            },
          );

        await saveCalendarEventLink(
          {
            calendarEventId:
              createdEvent.id,

            userId:
              createdEvent.userId,

            provider:
              'google',

            externalEventId:
              candidate.eventId,

            externalCalendarId:
              candidate.calendarId,

            externalUpdatedAt:
              candidate.updatedAt,
          },
        );

        imported +=
          1;
      } catch (error) {
        failed +=
          1;

        console.log(
          'Google Calendar event import failed:',
          candidate.eventId,
          error,
        );
      }

      continue;
    }

    const riseEvent =
      riseEventsById.get(
        link.calendarEventId,
      );

    /*
     * A link exists but its RISE event is missing.
     * Treat it as a failed sync rather than creating a duplicate.
     */
    if (!riseEvent) {
      failed +=
        1;

      continue;
    }

    /*
     * When both copies already match, there is no conflict.
     *
     * This also establishes external_updated_at for links created
     * before provider modification timestamps were tracked.
     */
    if (
      sameCalendarEvent(
        candidate,
        riseEvent,
      )
    ) {
      try {
        await markCalendarEventLinkSynced(
          riseEvent.id,
          'google',
          candidate.updatedAt,
        );

        skipped +=
          1;
      } catch (error) {
        failed +=
          1;

        console.log(
          'Google Calendar link baseline update failed:',
          candidate.eventId,
          error,
        );
      }

      continue;
    }

    const riseChanged =
      riseChangedSinceLastSync(
        riseEvent.updatedAt,
        link.lastSyncedAt,
      );

    const googleChanged =
      googleChangedSinceLastSync(
        candidate,
        link,
      );

    /*
     * No provider baseline exists yet.
     *
     * If RISE did not change after the previous sync, the difference
     * can safely be pulled from Google.
     *
     * If RISE did change too, we cannot determine whether Google also
     * changed, so preserve both copies rather than guessing.
     */
    if (
      googleChanged ===
      null
    ) {
      if (riseChanged) {
        failed +=
          1;

        console.log(
          'Google Calendar sync conflict cannot be classified without provider baseline:',
          candidate.eventId,
        );

        continue;
      }

      try {
        await updateCalendarEvent(
          riseEvent.id,
          {
            title:
              candidate.title,

            startAt:
              candidate.startAt,

            endAt:
              candidate.endAt,

            location:
              candidate.location,

            description:
              candidate.description,
          },
        );

        await markCalendarEventLinkSynced(
          riseEvent.id,
          'google',
          candidate.updatedAt,
        );

        skipped +=
          1;
      } catch (error) {
        failed +=
          1;

        console.log(
          'Google Calendar linked event update failed:',
          candidate.eventId,
          error,
        );
      }

      continue;
    }

    /*
     * Google changed but RISE did not.
     *
     * Google is the only changed copy, so pull it into RISE.
     */
    if (
      googleChanged &&
      !riseChanged
    ) {
      try {
        await updateCalendarEvent(
          riseEvent.id,
          {
            title:
              candidate.title,

            startAt:
              candidate.startAt,

            endAt:
              candidate.endAt,

            location:
              candidate.location,

            description:
              candidate.description,
          },
        );

        await markCalendarEventLinkSynced(
          riseEvent.id,
          'google',
          candidate.updatedAt,
        );

        skipped +=
          1;
      } catch (error) {
        failed +=
          1;

        console.log(
          'Google Calendar linked event update failed:',
          candidate.eventId,
          error,
        );
      }

      continue;
    }

    /*
     * RISE changed but Google did not.
     *
     * This is the reconnect/offline-edit case. RISE can safely push
     * its newer copy back to Google without asking the student to
     * reopen the event and save it again.
     */
    if (
      riseChanged &&
      !googleChanged
    ) {
      try {
        const updateResult =
          await updateGoogleCalendarEvent(
            candidate.eventId,
            candidate.calendarId,
            {
              title:
                riseEvent.title,

              startAt:
                riseEvent.startAt,

              endAt:
                riseEvent.endAt,

              location:
                riseEvent.location,

              description:
                riseEvent.description,
            },
          );

        await markCalendarEventLinkSynced(
          riseEvent.id,
          'google',
          updateResult.updatedAt ??
            candidate.updatedAt,
        );

        skipped +=
          1;
      } catch (error) {
        failed +=
          1;

        console.log(
          'Google Calendar RISE-side reconnect push failed:',
          candidate.eventId,
          error,
        );
      }

      continue;
    }

    /*
     * Both Google and RISE changed after the previous successful sync.
     * Neither side should silently overwrite the other.
     *
     * Story #85 will let the student choose which version wins.
     */
    if (
      riseChanged &&
      googleChanged
    ) {
      failed +=
        1;

      console.log(
        'Google Calendar sync conflict detected:',
        candidate.eventId,
      );

      continue;
    }

    /*
     * The copies differ even though neither recorded timestamp says
     * that side changed. This should be unusual, so preserve both
     * instead of silently choosing one.
     */
    failed +=
      1;

    console.log(
      'Google Calendar sync could not safely classify differing copies:',
      candidate.eventId,
    );
  }

  return {
    imported,

    skipped,

    failed,

    total:
      candidates.length,
  };
}