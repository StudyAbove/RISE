import {
  ExpoCalendarEvent,
  getCalendarPermissions,
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