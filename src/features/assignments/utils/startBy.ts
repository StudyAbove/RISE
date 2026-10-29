import { addDays } from 'date-fns';

/**
 * When to start an assignment so it's done on time without cramming.
 * Shared by the Weekly Forecast and High Priority Tasks on Home, so they
 * rank work the same way.
 */

// About how much a student gets done on one assignment in a day.
export const DAILY_WORK_MINUTES = 2 * 60;

/** The latest time to start: one day back from the due date per 2 hours of work. */
export function getStartBy(dueAt: Date, minutes: number): Date {
  const daysOfWork = Math.ceil(minutes / DAILY_WORK_MINUTES);
  return addDays(dueAt, -daysOfWork);
}
