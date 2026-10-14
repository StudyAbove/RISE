import { DEV_SKIP_AUTH } from '../lib/devFlags';
import { supabase } from '../lib/supabase';
import { getMockCalendarEvents } from '../mocks/calendarEvents';
import type { CalendarEvent, CalendarSource } from '../models/CalendarEvent';

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
}

const toCalendarEvent = (row: CalendarEventRow): CalendarEvent => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  startAt: row.start_at,
  endAt: row.end_at,
  source: row.source,
  location: row.location ?? undefined,
  description: row.description ?? undefined,
});

/**
 * The signed-in student's events that overlap [rangeStart, rangeEnd), earliest
 * first. Row-level security limits the query to the student's own events.
 * Throws if Supabase returns an error.
 */
export async function getCalendarEventsInRange(rangeStart: Date, rangeEnd: Date): Promise<CalendarEvent[]> {
  if (DEV_SKIP_AUTH) {
    // No one is signed in while the login skip is on, so Supabase would return nothing.
    return getMockCalendarEvents(rangeStart, rangeEnd);
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, user_id, title, start_at, end_at, source, location, description')
    // Overlaps the range: starts before it ends and ends after it starts.
    .lt('start_at', rangeEnd.toISOString())
    .gt('end_at', rangeStart.toISOString())
    .order('start_at');

  if (error) {
    throw error;
  }

  return (data as CalendarEventRow[]).map(toCalendarEvent);
}
