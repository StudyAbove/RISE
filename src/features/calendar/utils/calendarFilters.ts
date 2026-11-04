import { addDays, parseISO, startOfDay } from 'date-fns';

import type { CalendarEvent, CalendarEventType, CalendarSource } from '../../../models/CalendarEvent';

/** A type toggle on the filter sheet; 'none' is the "No type" row. */
export type EventTypeFilter = CalendarEventType | 'none';

/**
 * What the student chose to show on the calendar (#79).
 *
 * Types and sources are stored as what's hidden, so everything shows by
 * default and a type or source added later shows until it's turned off.
 */
export interface CalendarFilters {
  hiddenTypes: EventTypeFilter[];
  hiddenSources: CalendarSource[];
  /** The first day to show, or null for no limit. */
  fromDate: Date | null;
  /** The last day to show (the whole day), or null for no limit. */
  toDate: Date | null;
}

export const DEFAULT_CALENDAR_FILTERS: CalendarFilters = {
  hiddenTypes: [],
  hiddenSources: [],
  fromDate: null,
  toDate: null,
};

/** Whether any filter would hide events, e.g. to show "Some events are hidden". */
export function isFiltering(filters: CalendarFilters): boolean {
  return (
    filters.hiddenTypes.length > 0 ||
    filters.hiddenSources.length > 0 ||
    filters.fromDate !== null ||
    filters.toDate !== null
  );
}

/** Whether the event touches the chosen days. Events crossing the edge count. */
function isWithinDates(event: CalendarEvent, filters: CalendarFilters): boolean {
  const start = parseISO(event.startAt).getTime();
  // A zero-length event still counts on its own day.
  const end = Math.max(parseISO(event.endAt).getTime(), start + 1);

  const rangeStart = filters.fromDate ? startOfDay(filters.fromDate).getTime() : -Infinity;
  // The midnight after the last day, so the whole last day is included.
  const rangeEnd = filters.toDate ? addDays(startOfDay(filters.toDate), 1).getTime() : Infinity;

  return start < rangeEnd && end > rangeStart;
}

/**
 * The events to draw on the calendar. An event shows only when its type is
 * on, its source is on, and it falls within the chosen dates.
 */
export function filterCalendarEvents(events: CalendarEvent[], filters: CalendarFilters): CalendarEvent[] {
  if (!isFiltering(filters)) {
    return events;
  }

  return events.filter(
    (event) =>
      !filters.hiddenTypes.includes(event.eventType ?? 'none') &&
      !filters.hiddenSources.includes(event.source) &&
      isWithinDates(event, filters)
  );
}
