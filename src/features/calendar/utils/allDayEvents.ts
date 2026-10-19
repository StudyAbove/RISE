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

/** An all-day event drawn as one bar across the days it covers in a view. */
export interface AllDayBar {
  event: CalendarEvent;
  /** The first visible day it covers, as an index into the view's days. */
  startIndex: number;
  /** How many visible days it covers. */
  span: number;
  /** Which row of the all-day strip it sits in; 0 is the top. */
  lane: number;
}

/**
 * Lays out the all-day events of a view as bars across consecutive days.
 * A bar is cut off at the edges of the visible days, and bars that share a
 * day go in different lanes so they never cover each other. Earlier and
 * longer events get the higher lanes.
 */
export function layoutAllDayBars(events: CalendarEvent[], days: Date[]): AllDayBar[] {
  if (days.length === 0) {
    return [];
  }

  const firstVisible = startOfDay(days[0]);
  const lastIndex = days.length - 1;

  const bars = events
    .map((event) => ({ event, range: getAllDayRange(event) }))
    .filter((item): item is { event: CalendarEvent; range: AllDayRange } => item.range !== null)
    .map(({ event, range }) => {
      const first = differenceInCalendarDays(range.firstDay, firstVisible);
      const last = differenceInCalendarDays(range.lastDay, firstVisible);
      const startIndex = Math.max(first, 0);
      return { event, startIndex, span: Math.min(last, lastIndex) - startIndex + 1, visible: last >= 0 && first <= lastIndex };
    })
    .filter((bar) => bar.visible)
    .sort((a, b) => a.startIndex - b.startIndex || b.span - a.span);

  // The last day index taken in each lane so far.
  const laneEnds: number[] = [];

  return bars.map(({ event, startIndex, span }) => {
    let lane = laneEnds.findIndex((end) => end < startIndex);
    if (lane === -1) {
      lane = laneEnds.length;
    }
    laneEnds[lane] = startIndex + span - 1;
    return { event, startIndex, span, lane };
  });
}
