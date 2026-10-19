import { differenceInCalendarDays, isBefore, parseISO, startOfDay, subDays } from 'date-fns';

import type { CalendarEvent } from '../../../models/CalendarEvent';

/** The days an all-day event covers, both at midnight. */
export interface AllDayRange {
  firstDay: Date;
  lastDay: Date;
}

const isMidnight = (date: Date) =>
  date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0;

/**
 * The days an all-day event covers, or null for an event with times.
 *
 * Events don't store an all-day flag, so this goes by their times. Imported
 * all-day events start at midnight and end either at a later midnight
 * (Google: the day after the last day) or at 11:59 PM on the last day (Apple).
 */
export function getAllDayRange(event: CalendarEvent): AllDayRange | null {
  const start = parseISO(event.startAt);
  const end = parseISO(event.endAt);

  if (!isMidnight(start)) {
    return null;
  }

  if (isMidnight(end) && differenceInCalendarDays(end, start) >= 1) {
    return { firstDay: start, lastDay: subDays(end, 1) };
  }

  if (end.getHours() === 23 && end.getMinutes() === 59 && !isBefore(startOfDay(end), start)) {
    return { firstDay: start, lastDay: startOfDay(end) };
  }

  return null;
}

export function isAllDayEvent(event: CalendarEvent): boolean {
  return getAllDayRange(event) !== null;
}
