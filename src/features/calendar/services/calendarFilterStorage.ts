import Storage from 'expo-sqlite/kv-store';

import type { CalendarSource } from '../../../models/CalendarEvent';
import {
  DEFAULT_CALENDAR_FILTERS,
  type CalendarFilters,
  type EventTypeFilter,
} from '../utils/calendarFilters';
import { EVENT_SOURCE_LABELS, EVENT_TYPE_LABELS } from '../utils/eventLabels';

/*
 * The calendar's type, source, and course toggles (#79, #159) are kept on the
 * phone, in the same store the Supabase session uses, so they stay set after
 * the app restarts. The date range isn't saved: a forgotten range would quietly hide
 * events the next time the student opens the app.
 */

const STORAGE_KEY = 'rise.calendarFilters';

const TYPE_FILTERS: EventTypeFilter[] = [
  ...(Object.keys(EVENT_TYPE_LABELS) as EventTypeFilter[]),
  'none',
];

const SOURCES = Object.keys(EVENT_SOURCE_LABELS) as CalendarSource[];

// Keeps only the values RISE still knows, so an old or damaged save can't
// hide events forever.
function knownValues<T extends string>(value: unknown, allowed: T[]): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return allowed.filter((item) => value.includes(item));
}

// Course ids can't be checked against the student's courses before they
// load, but an id for a course that's gone matches no events, so it hides
// nothing.
function textValues(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

/**
 * The saved toggles, with no date range. Anything missing, unreadable, or
 * unknown falls back to showing everything.
 */
export function loadCalendarFilters(): CalendarFilters {
  try {
    const saved = Storage.getItemSync(STORAGE_KEY);

    if (!saved) {
      return DEFAULT_CALENDAR_FILTERS;
    }

    const parsed: unknown = JSON.parse(saved);
    const record = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};

    return {
      ...DEFAULT_CALENDAR_FILTERS,
      hiddenTypes: knownValues(record.hiddenTypes, TYPE_FILTERS),
      hiddenSources: knownValues(record.hiddenSources, SOURCES),
      hiddenCourses: textValues(record.hiddenCourses),
    };
  } catch (error) {
    console.log('Could not load the saved calendar filters:', error);
    return DEFAULT_CALENDAR_FILTERS;
  }
}

/** Saves the type, source, and course toggles. A failed save only means they reset next time. */
export function saveCalendarFilters(filters: CalendarFilters): void {
  try {
    Storage.setItemSync(
      STORAGE_KEY,
      JSON.stringify({
        hiddenTypes: filters.hiddenTypes,
        hiddenSources: filters.hiddenSources,
        hiddenCourses: filters.hiddenCourses,
      })
    );
  } catch (error) {
    console.log('Could not save the calendar filters:', error);
  }
}
