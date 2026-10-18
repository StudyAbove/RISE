import { DEV_SKIP_AUTH } from '../lib/devFlags';
import { supabase } from '../lib/supabase';
import {
  addMockCalendarEvent,
  getMockCalendarEvents,
} from '../mocks/calendarEvents';

import type {
  CalendarEvent,
  CalendarEventType,
  CalendarSource,
  NewCalendarEvent,
} from '../models/CalendarEvent';

// A row of the calendar_events table, as Supabase returns it.
interface CalendarEventRow {
  id: string;
  user_id: string;
  title: string;
  start_at: string;
  end_at: string;
  source: CalendarSource;
  location: string | null;
  description: string | null;
  // Added by the #31 migration; missing until it's applied.
  event_type?: CalendarEventType | null;
  reminder_minutes?: number | null;
}

interface CalendarEventSyncRow
  extends CalendarEventRow {
  updated_at: string | null;
}

export interface CalendarEventSyncRecord
  extends CalendarEvent {
  updatedAt?: string;
}

export interface CreateCalendarEventInput {
  title: string;
  startAt: string;
  endAt: string;
  source: CalendarSource;
  location?: string;
  description?: string;
}

export interface UpdateCalendarEventInput {
  title: string;
  startAt: string;
  endAt: string;
  location?: string;
  description?: string;

  // RISE-only metadata. These values are stored in RISE but are not
  // synchronized to Apple Calendar or Google Calendar.
  eventType?: CalendarEventType | null;
  reminderMinutes?: number | null;
}

const CALENDAR_EVENT_COLUMNS =
  'id, user_id, title, start_at, end_at, source, location, description, event_type, reminder_minutes';

const CALENDAR_EVENT_SYNC_COLUMNS =
  `${CALENDAR_EVENT_COLUMNS}, updated_at`;

const toCalendarEvent = (
  row: CalendarEventRow,
): CalendarEvent => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  startAt: row.start_at,
  endAt: row.end_at,
  source: row.source,
  location:
    row.location ?? undefined,
  description:
    row.description ?? undefined,
  eventType:
    row.event_type ?? undefined,
  reminderMinutes:
    row.reminder_minutes ?? undefined,
});

const toCalendarEventSyncRecord = (
  row: CalendarEventSyncRow,
): CalendarEventSyncRecord => ({
  ...toCalendarEvent(row),

  updatedAt:
    row.updated_at ??
    undefined,
});

/**
 * Creates a RISE calendar event from an event that already exists
 * in an external calendar such as Apple Calendar or Google Calendar.
 *
 * This is used by calendar import/sync flows. It is separate from
 * the Add Event user story, which owns manually creating new events
 * inside RISE.
 */
export async function createImportedCalendarEvent(
  input: CreateCalendarEventInput,
): Promise<CalendarEvent> {
  const {
    data: {
      user,
    },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error(
      'NO_SIGNED_IN_USER',
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from('calendar_events')
      .insert({
        user_id:
          user.id,

        title:
          input.title,

        start_at:
          input.startAt,

        end_at:
          input.endAt,

        source:
          input.source,

        location:
          input.location?.trim() ||
          null,

        description:
          input.description?.trim() ||
          null,
      })
      .select(
        CALENDAR_EVENT_COLUMNS,
      )
      .single();

  if (error) {
    throw error;
  }

  return toCalendarEvent(
    data as CalendarEventRow,
  );
}

/**
 * The signed-in student's events that overlap [rangeStart, rangeEnd),
 * earliest first.
 *
 * Row-level security limits the query to the student's own events.
 */
export async function getCalendarEventsInRange(
  rangeStart: Date,
  rangeEnd: Date,
): Promise<CalendarEvent[]> {
  if (DEV_SKIP_AUTH) {
    return getMockCalendarEvents(
      rangeStart,
      rangeEnd,
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from('calendar_events')
      .select(
        // All columns, so the new event_type and reminder_minutes come back
        // once the #31 migration is applied, and this still works before it is.
        '*',
      )
      .lt(
        'start_at',
        rangeEnd.toISOString(),
      )
      .gt(
        'end_at',
        rangeStart.toISOString(),
      )
      .order(
        'start_at',
      );

  if (error) {
    throw error;
  }

  return (
    data as CalendarEventRow[]
  ).map(
    toCalendarEvent,
  );
}

/**
 * Loads a group of existing RISE events for external calendar sync.
 *
 * updated_at is included so the sync service can tell whether the
 * RISE copy was changed after its previous successful provider sync.
 */
export async function getCalendarEventsByIdsForSync(
  eventIds: string[],
): Promise<CalendarEventSyncRecord[]> {
  if (
    eventIds.length ===
    0
  ) {
    return [];
  }

  const {
    data,
    error,
  } =
    await supabase
      .from('calendar_events')
      .select(
        CALENDAR_EVENT_SYNC_COLUMNS,
      )
      .in(
        'id',
        eventIds,
      );

  if (error) {
    throw error;
  }

  return (
    data as CalendarEventSyncRow[]
  ).map(
    toCalendarEventSyncRecord,
  );
}

/**
 * Updates one RISE calendar event.
 *
 * Row-level security ensures that the signed-in student can only update
 * their own calendar events.
 *
 * External Apple/Google synchronization is handled separately after this
 * local RISE update succeeds.
 */
export async function updateCalendarEvent(
  eventId: string,
  updates: UpdateCalendarEventInput,
): Promise<CalendarEvent> {
  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await supabase
      .from('calendar_events')
      .update({
        title:
          updates.title,

        start_at:
          updates.startAt,

        end_at:
          updates.endAt,

        location:
          updates.location?.trim() ||
          null,

        description:
          updates.description?.trim() ||
          null,

        // Only change RISE-only metadata when the caller explicitly
        // provides it. Conflict resolution and provider-import flows
        // can therefore update the shared fields without clearing
        // the student's Type or Reminder selections.
        ...(
          'eventType' in updates
            ? {
                event_type:
                  updates.eventType ??
                  null,
              }
            : {}
        ),

        ...(
          'reminderMinutes' in updates
            ? {
                reminder_minutes:
                  updates.reminderMinutes ??
                  null,
              }
            : {}
        ),

        updated_at:
          now,
      })
      .eq(
        'id',
        eventId,
      )
      .select(
        CALENDAR_EVENT_COLUMNS,
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      'Calendar event could not be found or updated.',
    );
  }

  return toCalendarEvent(
    data as CalendarEventRow,
  );
}

/**
 * Saves an event the student made with the Add Event form (#31), owned by
 * the signed-in student, and returns it as stored. Throws if no one is signed
 * in or Supabase returns an error.
 *
 * Imported Apple/Google events use createImportedCalendarEvent instead.
 */
export async function createCalendarEvent(
  input: NewCalendarEvent,
): Promise<CalendarEvent> {
  if (DEV_SKIP_AUTH) {
    // No one is signed in, so Supabase would reject the insert.
    return addMockCalendarEvent(input);
  }

  const {
    data: {
      user,
    },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error(
      'No signed-in user was found.',
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from('calendar_events')
      .insert({
        // Row Level Security only accepts rows owned by the signed-in student.
        user_id: user.id,
        title: input.title,
        start_at: input.startAt,
        end_at: input.endAt,
        source: 'rise',
        location: input.location ?? null,
        description: input.description ?? null,
        event_type: input.eventType ?? null,
        reminder_minutes: input.reminderMinutes ?? null,
      })
      .select()
      .single();

  if (error) {
    throw error;
  }

  return toCalendarEvent(
    data as CalendarEventRow,
  );
}

/**
 * Deletes one RISE calendar event.
 *
 * Database foreign keys cascade the deletion to its calendar links and
 * conflict records. Provider copies must be handled by the sync/resolution
 * service before this function is called when those copies still exist.
 */
export async function deleteCalendarEvent(
  eventId: string,
): Promise<void> {
  const {
    data,
    error,
  } =
    await supabase
      .from('calendar_events')
      .delete()
      .eq(
        'id',
        eventId,
      )
      .select(
        'id',
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      'Calendar event could not be found or deleted.',
    );
  }
}
