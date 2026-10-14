import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

/** The views offered by the Month / Week / 2 Day / Day switcher. */
export type CalendarViewMode = 'month' | 'week' | 'twoDay' | 'day';

// Figma's weekday headers run S M T W T F S, so weeks start on Sunday.
const WEEK_OPTIONS = { weekStartsOn: 0 } as const;

/**
 * Every day shown in the month grid for `date`'s month: whole Sunday–Saturday
 * weeks, so the first and last rows include days from the neighboring months.
 * The grid leaves those days blank (check with `isSameMonth`).
 */
export function getMonthGridDays(date: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(date), WEEK_OPTIONS),
    end: endOfWeek(endOfMonth(date), WEEK_OPTIONS),
  });
}

/**
 * The day columns for the hourly views. `anchorDate` is the selected day:
 * Week shows its whole week, 2 Day shows it and the next day, Day shows only it.
 */
export function getTimeGridDays(
  view: Exclude<CalendarViewMode, 'month'>,
  anchorDate: Date
): Date[] {
  switch (view) {
    case 'week':
      return eachDayOfInterval({
        start: startOfWeek(anchorDate, WEEK_OPTIONS),
        end: endOfWeek(anchorDate, WEEK_OPTIONS),
      });
    case 'twoDay':
      return [anchorDate, addDays(anchorDate, 1)];
    case 'day':
      return [anchorDate];
  }
}

/**
 * The span of time a view shows, for loading its events. `end` is the midnight
 * after the last visible day, so an event counts as visible when it starts
 * before `end` and ends after `start`.
 */
export function getVisibleRange(view: CalendarViewMode, anchorDate: Date): { start: Date; end: Date } {
  const days = view === 'month' ? getMonthGridDays(anchorDate) : getTimeGridDays(view, anchorDate);

  return {
    start: startOfDay(days[0]),
    end: addDays(startOfDay(days[days.length - 1]), 1),
  };
}

/**
 * Moves the selected day one page back (-1) or forward (1) for the ‹ › arrows:
 * a month, a week, two days, or one day depending on the view.
 */
export function shiftAnchorDate(
  view: CalendarViewMode,
  anchorDate: Date,
  direction: 1 | -1
): Date {
  switch (view) {
    case 'month':
      // date-fns keeps the day when it can and clamps otherwise (Jan 31 → Feb 28).
      return addMonths(anchorDate, direction);
    case 'week':
      return addWeeks(anchorDate, direction);
    case 'twoDay':
      return addDays(anchorDate, 2 * direction);
    case 'day':
      return addDays(anchorDate, direction);
  }
}
