import { addYears, subYears } from 'date-fns';

import {
  anyColumnContains,
  eventMatchesSearch,
  normalizeSearchTerm,
  orderSearchResults,
} from '../features/calendar/utils/calendarSearch';
import { DEV_SKIP_AUTH } from '../lib/devFlags';
import { supabase } from '../lib/supabase';
import {
  addMockCalendarEvent,
  deleteMockCalendarEvent,
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
  // Added by the #159 migration. course_id comes back as the joined course.
  assignment_id?: string | null;
  course_id?: string | null;
  courses?: {
    name: string;
    code: string | null;
    sync_enabled: boolean;
  } | null;
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
  assignmentId:
    row.assignment_id ?? undefined,
  course:
    row.course_id && row.courses
      ? {
          id: row.course_id,
          name: row.courses.name,
          code: row.courses.code ?? undefined,
        }
      : undefined,
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
 * earliest first, each with its course. Leaves out events from courses the
 * student stopped syncing, like the Assignments page does.
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

  const rows =
    await loadEventsWithCourses(
      (columns) =>
        supabase
          .from('calendar_events')
          .select(
            columns,
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
          ),
    );

  return rows.map(
    toCalendarEvent,
  );
}

type EventsQuery = (
  columns: string,
) => PromiseLike<{
  data: unknown;
  error: { code?: string } | null;
}>;

/**
 * Runs an events query with each event's course, leaving out events from
 * courses the student stopped syncing.
 */
async function loadEventsWithCourses(
  query: EventsQuery,
): Promise<CalendarEventRow[]> {
  // All columns, plus each event's course through course_id.
  let {
    data,
    error,
  } =
    await query(
      '*, courses(name, code, sync_enabled)',
    );

  // Before the #159 migration there's no course_id to follow, and Supabase
  // rejects the whole query (PGRST200). Load the events without courses.
  if (
    error?.code ===
    'PGRST200'
  ) {
    ({
      data,
      error,
    } =
      await query(
        '*',
      ));
  }

  if (error) {
    throw error;
  }

  return (
    data as CalendarEventRow[]
  ).filter(
    (row) =>
      row.courses?.sync_enabled !==
      false,
  );
}

// Plenty for one search term, while a very broad one ("a") can't load the
// whole calendar.
const SEARCH_QUERY_LIMIT = 500;

/**
 * The signed-in student's events whose title, location, description, or
 * course name or code contains the term, ignoring case (#78). Upcoming
 * events come first; see orderSearchResults.
 *
 * Row-level security limits every query to the student's own events and
 * courses (AC9).
 */
export async function searchCalendarEvents(
  term: string,
): Promise<CalendarEvent[]> {
  const search =
    normalizeSearchTerm(
      term,
    );

  if (!search) {
    return [];
  }

  if (DEV_SKIP_AUTH) {
    const now = new Date();

    return orderSearchResults(
      getMockCalendarEvents(
        subYears(now, 1),
        addYears(now, 1),
      ).filter(
        (event) =>
          eventMatchesSearch(
            event,
            search,
          ),
      ),
    );
  }

  // An event's own columns and its course's can't be OR'd in one filter, so
  // matching courses are found first, then their events.
  const [
    textRows,
    courseIds,
  ] =
    await Promise.all([
      loadEventsWithCourses(
        (columns) =>
          supabase
            .from('calendar_events')
            .select(
              columns,
            )
            .or(
              anyColumnContains(
                ['title', 'location', 'description'],
                search,
              ),
            )
            .order(
              'start_at',
            )
            .limit(
              SEARCH_QUERY_LIMIT,
            ),
      ),
      findMatchingCourseIds(
        search,
      ),
    ]);

  const courseRows =
    courseIds.length > 0
      ? await loadEventsWithCourses(
          (columns) =>
            supabase
              .from('calendar_events')
              .select(
                columns,
              )
              .in(
                'course_id',
                courseIds,
              )
              .order(
                'start_at',
              )
              .limit(
                SEARCH_QUERY_LIMIT,
              ),
        )
      : [];

  // An event can match both ways, e.g. "CECS 449 Lecture" in course CECS 449.
  const eventsById =
    new Map(
      [...textRows, ...courseRows].map(
        (row) => [
          row.id,
          toCalendarEvent(row),
        ],
      ),
    );

  return orderSearchResults([
    ...eventsById.values(),
  ]);
}

/** Ids of the student's courses whose name or code contains the term. */
async function findMatchingCourseIds(
  search: string,
): Promise<string[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from('courses')
      .select(
        'id',
      )
      .or(
        anyColumnContains(
          ['name', 'code'],
          search,
        ),
      );

  if (error) {
    throw error;
  }

  return (
    data ?? []
  ).map(
    (course) =>
      course.id as string,
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
 * Changes the provider shown as the source of an existing RISE event.
 *
 * This is used when a multi-provider event remains backed by another
 * calendar after one provider is disconnected.
 */
export async function updateCalendarEventSource(
  eventId: string,
  source: CalendarSource,
): Promise<CalendarEvent> {
  const {
    data,
    error,
  } =
    await supabase
      .from('calendar_events')
      .update({
        source,
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
 * Permanently deletes one RISE calendar event.
 *
 * Provider copies in Apple or Google Calendar must be handled before this
 * function runs. Database foreign keys then cascade the RISE deletion to its
 * calendar links and conflict records.
 *
 * Row-level security only lets students delete their own events, so a row
 * that does not exist or cannot be deleted counts as a failure.
 */
export async function deleteCalendarEvent(
  eventId: string,
): Promise<void> {
  if (DEV_SKIP_AUTH) {
    // No one is signed in, so Supabase would reject the delete.
    deleteMockCalendarEvent(eventId);
    return;
  }

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
      .select('id');

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(
      'Calendar event could not be found or deleted.',
    );
  }
}
