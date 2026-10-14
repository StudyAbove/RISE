import { addDays, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns';

import type { CalendarEvent } from '../../../models/CalendarEvent';

export const MINUTES_IN_DAY = 24 * 60;

/** The part of an event that falls on one day, in minutes after that day's midnight. */
export interface DayEventSegment {
  event: CalendarEvent;
  startMinute: number;
  endMinute: number;
}

// Clock time as minutes (2:30 PM → 870). Uses the time shown on the clock rather
// than time elapsed since midnight, so events line up with the hour labels even
// on daylight-saving days, which are 23 or 25 hours long.
const minuteOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();

/**
 * The events that appear on `day`, earliest first, each trimmed to that day.
 * An event that crosses midnight appears on both days: until midnight on the
 * first, and from midnight on the second.
 *
 * Every view places events with this function, so an event is on the same
 * date and time no matter which view the student is using.
 */
export function getDaySegments(events: CalendarEvent[], day: Date): DayEventSegment[] {
  const dayStart = startOfDay(day);
  const nextDayStart = addDays(dayStart, 1);

  return events
    .map((event) => ({ event, start: parseISO(event.startAt), end: parseISO(event.endAt) }))
    .filter(({ start, end }) => {
      // Visible when it starts before the day ends and ends after the day starts.
      // A zero-length event (start = end) still shows on its own day.
      const endsAfterDayStart = isBefore(dayStart, end) || (start.getTime() === end.getTime() && isSameDay(start, day));
      return isBefore(start, nextDayStart) && endsAfterDayStart;
    })
    .map(({ event, start, end }) => ({
      event,
      startMinute: isBefore(start, dayStart) ? 0 : minuteOfDay(start),
      endMinute: isBefore(end, nextDayStart) ? minuteOfDay(end) : MINUTES_IN_DAY,
    }))
    // Earliest first; when two start together, the longer one first.
    .sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);
}
