import { addDays, parseISO, startOfDay } from 'date-fns';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { isAllDayEvent } from '../../calendar/utils/allDayEvents';
import {
  DAILY_WORK_MINUTES,
  type StudyMinutesOn,
} from '../../assignments/utils/startBy';

/**
 * How the student's calendar changes their plan on Home (#67): the more of a
 * day is taken up by events, the less schoolwork RISE expects that day.
 */

// Hours of events in a day → study time RISE expects that day.
const BUSY_DAY_MINUTES = 6 * 60;
const FULL_DAY_MINUTES = 10 * 60;
const BUSY_DAY_STUDY_MINUTES = 60;

/**
 * Minutes of events on each day, keyed by the day's midnight. Overlapping
 * events count once, events over midnight are split between days, and
 * all-day events (like holidays) and study blocks don't count as busy.
 */
export function getEventMinutesByDay(events: CalendarEvent[]): Map<number, number> {
  const intervals = events
    .filter((event) => !isAllDayEvent(event) && event.eventType !== 'study')
    .map((event) => ({ start: parseISO(event.startAt).getTime(), end: parseISO(event.endAt).getTime() }))
    .filter(({ start, end }) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .sort((a, b) => a.start - b.start);

  // Merge overlapping events so double-booked time isn't counted twice.
  const merged: { start: number; end: number }[] = [];
  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  const minutesByDay = new Map<number, number>();

  for (const { start, end } of merged) {
    let dayStart = startOfDay(new Date(start));

    while (dayStart.getTime() < end) {
      const nextDay = addDays(dayStart, 1);
      const overlap = Math.min(end, nextDay.getTime()) - Math.max(start, dayStart.getTime());
      const key = dayStart.getTime();

      minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + overlap / 60_000);
      dayStart = nextDay;
    }
  }

  return minutesByDay;
}

/** 2 hours on a normal day, 1 hour with 6+ hours of events, none with 10+. */
export function studyMinutesForEventMinutes(eventMinutes: number): number {
  if (eventMinutes >= FULL_DAY_MINUTES) return 0;
  if (eventMinutes >= BUSY_DAY_MINUTES) return BUSY_DAY_STUDY_MINUTES;
  return DAILY_WORK_MINUTES;
}

/** Study time for any day, based on the student's events that day. */
export function getStudyMinutesOn(eventMinutesByDay: Map<number, number>): StudyMinutesOn {
  return (day) =>
    studyMinutesForEventMinutes(eventMinutesByDay.get(startOfDay(day).getTime()) ?? 0);
}
