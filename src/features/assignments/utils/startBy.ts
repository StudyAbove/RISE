import { addDays } from 'date-fns';

/**
 * When to start an assignment so it's done on time without cramming.
 * Shared by the Weekly Forecast and High Priority Tasks on Home, so they
 * rank work the same way.
 */

// About how much a student gets done on one assignment in a normal day.
export const DAILY_WORK_MINUTES = 2 * 60;

/** How much study time a day has; less on days full of events (#67). */
export type StudyMinutesOn = (day: Date) => number;

const EVERY_DAY_THE_SAME: StudyMinutesOn = () => DAILY_WORK_MINUTES;

// Stop looking back after this many days, e.g. if every day is fully booked.
const MAX_DAYS_BACK = 60;

/**
 * The latest time to start: walks back a day at a time from the due date,
 * using up each day's study time, until the work fits.
 */
export function getStartBy(
  dueAt: Date,
  minutes: number,
  studyMinutesOn: StudyMinutesOn = EVERY_DAY_THE_SAME,
): Date {
  let remaining = minutes;
  let daysBack = 0;

  while (remaining > 0 && daysBack < MAX_DAYS_BACK) {
    daysBack += 1;
    remaining -= studyMinutesOn(addDays(dueAt, -daysBack));
  }

  return addDays(dueAt, -daysBack);
}
