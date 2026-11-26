import { differenceInCalendarDays } from 'date-fns';

/** Shown on the Streak page after a streak ends (#11), one per day. */
export const RESET_MESSAGES = [
  'Missing one doesn’t erase your progress. Let’s start again.',
  'Progress, not perfection. You’ve got this.',
  'Every streak starts with one day. Today can be day one.',
  'You’ve built a streak before, and you can do it again.',
  'One missed assignment doesn’t define you. Your next one is a fresh start.',
] as const;

// Any fixed day works; it just sets which message comes first.
const FIRST_DAY = new Date(2026, 0, 1);

/** Today's message. Stays the same all day, so it doesn't change on every visit. */
export function getResetMessage(date: Date): string {
  const days = differenceInCalendarDays(date, FIRST_DAY);
  const count = RESET_MESSAGES.length;

  // Wraps around for dates before FIRST_DAY too.
  return RESET_MESSAGES[((days % count) + count) % count];
}
