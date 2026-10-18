import {
  ExpoCalendarEvent,
  getCalendarPermissions,
  getDefaultCalendarSync,
  requestCalendarPermissions,
} from 'expo-calendar';

export type AppleCalendarAccess =
  | 'full'
  | 'write-only'
  | 'denied';

export interface AppleCalendarEventUpdate {
  title: string;
  startAt: string;
  endAt: string;
  location?: string;
  description?: string;
}

export interface AppleCalendarEventUpdateResult {
  updatedAt?: string;
}

function normalizeAppleModifiedDate(
  value?: string | Date,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return undefined;
  }

  return parsed.toISOString();
}

function normalizeAppleEventDate(
  value?: string | Date,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return undefined;
  }

  return parsed.toISOString();
}

export async function getAppleCalendarAccess(): Promise<AppleCalendarAccess> {
  const fullAccess =
    await getCalendarPermissions(
      false,
    );

  if (
    fullAccess.status ===
    'granted'
  ) {
    return 'full';
  }

  const writeOnlyAccess =
    await getCalendarPermissions(
      true,
    );

  if (
    writeOnlyAccess.status ===
    'granted'
  ) {
    return 'write-only';
  }

  return 'denied';
}

export async function requestAppleCalendarFullAccess() {
  return requestCalendarPermissions(
    false,
  );
}

/**
 * Updates an existing event in Apple Calendar.
 *
 * The event was previously imported from Apple Calendar,
 * so externalEventId is Apple's real event ID.
 *
 * After updating, the event is read again so RISE can store
 * Apple's current lastModifiedDate as the provider baseline.
 */
export async function updateAppleCalendarEvent(
  externalEventId: string,
  updates: AppleCalendarEventUpdate,
): Promise<AppleCalendarEventUpdateResult> {
  const access =
    await getAppleCalendarAccess();

  if (
    access !==
    'full'
  ) {
    throw new Error(
      'APPLE_CALENDAR_NOT_CONNECTED',
    );
  }

  if (
    !externalEventId
  ) {
    throw new Error(
      'APPLE_EVENT_ID_MISSING',
    );
  }

  const requestedStart =
    new Date(
      updates.startAt,
    );

  const requestedEnd =
    new Date(
      updates.endAt,
    );

  console.log(
    'Apple Calendar update requested:',
    {
      externalEventId,
      startAt:
        requestedStart.toISOString(),
      endAt:
        requestedEnd.toISOString(),
    },
  );

  const appleEvent =
    await ExpoCalendarEvent.get(
      externalEventId,
    );

  await appleEvent.update({
    title:
      updates.title,

    startDate:
      requestedStart,

    endDate:
      requestedEnd,

    location:
      updates.location?.trim() ||
      null,

    notes:
      updates.description?.trim() ||
      '',
  });

  const refreshedEvent =
    await ExpoCalendarEvent.get(
      externalEventId,
    );

  console.log(
    'Apple Calendar update persisted:',
    {
      externalEventId,
      startDate:
        normalizeAppleEventDate(
          refreshedEvent.startDate,
        ),
      endDate:
        normalizeAppleEventDate(
          refreshedEvent.endDate,
        ),
      lastModifiedDate:
        normalizeAppleModifiedDate(
          refreshedEvent.lastModifiedDate,
        ),
    },
  );

  return {
    updatedAt:
      normalizeAppleModifiedDate(
        refreshedEvent.lastModifiedDate,
      ),
  };
}

export interface AppleCalendarEventCreate {
  title: string;
  startAt: string;
  endAt: string;
  location?: string;
  description?: string;
  /** Minutes before the start to alert the student, e.g. 1440 for 1 day. */
  reminderMinutes?: number;
}

export interface AppleCalendarEventCreateResult {
  externalEventId: string;
  externalCalendarId: string;
  updatedAt?: string;
}

/**
 * Adds an event the student made in RISE to the phone's default calendar
 * (#123). Needs Full Access, like updates, since that's what counts as a
 * connected Apple Calendar.
 */
export async function createAppleCalendarEvent(
  event: AppleCalendarEventCreate,
): Promise<AppleCalendarEventCreateResult> {
  const access =
    await getAppleCalendarAccess();

  if (
    access !==
    'full'
  ) {
    throw new Error(
      'APPLE_CALENDAR_NOT_CONNECTED',
    );
  }

  let calendar;

  try {
    calendar =
      getDefaultCalendarSync();
  } catch {
    // For example, the phone has no calendar that new events can go into.
    throw new Error(
      'APPLE_DEFAULT_CALENDAR_MISSING',
    );
  }

  const created =
    await calendar.createEvent({
      title:
        event.title,
      startDate:
        new Date(event.startAt),
      endDate:
        new Date(event.endAt),
      location:
        event.location?.trim() ||
        undefined,
      notes:
        event.description?.trim() ||
        undefined,
      // A negative offset is that many minutes before the start.
      alarms:
        event.reminderMinutes
          ? [
              {
                relativeOffset:
                  -event.reminderMinutes,
              },
            ]
          : undefined,
    });

  return {
    externalEventId:
      created.id,
    externalCalendarId:
      created.calendarId ??
      calendar.id,
    updatedAt:
      normalizeAppleModifiedDate(
        created.lastModifiedDate,
      ),
  };
}

/**
 * Deletes an event from Apple Calendar, so the next sync doesn't
 * import it into RISE again. Used to remove a new copy RISE couldn't
 * link (#123).
 *
 * Only the one occurrence on startAt is removed, never a whole
 * repeating series. An event that is already gone counts as deleted.
 */
export async function deleteAppleCalendarEvent(
  externalEventId: string,
  startAt: string,
): Promise<void> {
  const access =
    await getAppleCalendarAccess();

  if (
    access !==
    'full'
  ) {
    throw new Error(
      'APPLE_CALENDAR_NOT_CONNECTED',
    );
  }

  if (
    !externalEventId
  ) {
    throw new Error(
      'APPLE_EVENT_ID_MISSING',
    );
  }

  let appleEvent:
    ExpoCalendarEvent;

  try {
    // Throws when no event has this ID anymore.
    appleEvent =
      await ExpoCalendarEvent.get(
        externalEventId,
      );
  } catch {
    return;
  }

  const occurrence =
    appleEvent.recurrenceRule
      ? appleEvent.getOccurrenceSync({
          instanceStartDate:
            startAt,
        })
      : appleEvent;

  await occurrence.delete();
}
