import type { CalendarEvent } from '../../../models/CalendarEvent';

/*
 * Calendar search (#78): partial matches, ignoring upper and lower case
 * (AC3, AC4). The database does the matching with ILIKE; the dev mock data
 * uses eventMatchesSearch.
 */

/** The term to search for: trimmed, with runs of spaces made one. '' means no search. */
export function normalizeSearchTerm(term: string): string {
  return term.trim().replace(/\s+/g, ' ');
}

/**
 * An ILIKE pattern that matches the term anywhere in the text. %, _, and \
 * in the term are escaped, so searching "50%" finds "50%", not "500".
 */
export function containsPattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

/**
 * A Supabase .or() filter: any of the columns contains the term. Each value is
 * quoted, since commas, dots, and parentheses separate parts of the filter.
 */
export function anyColumnContains(columns: string[], term: string): string {
  const quoted = `"${containsPattern(term).replace(/[\\"]/g, (character) => `\\${character}`)}"`;

  return columns.map((column) => `${column}.ilike.${quoted}`).join(',');
}

/** At most this many results are shown. */
export const SEARCH_RESULT_LIMIT = 50;

/**
 * Upcoming events first, soonest first, then past ones, most recent first,
 * so what's still ahead isn't pushed out by old events. Keeps the first
 * SEARCH_RESULT_LIMIT. An event happening now counts as upcoming.
 */
export function orderSearchResults(events: CalendarEvent[], now = new Date()): CalendarEvent[] {
  const time = (iso: string) => new Date(iso).getTime();
  const isUpcoming = (event: CalendarEvent) => time(event.endAt) >= now.getTime();

  const upcoming = events.filter(isUpcoming).sort((a, b) => time(a.startAt) - time(b.startAt));
  const past = events.filter((event) => !isUpcoming(event)).sort((a, b) => time(b.startAt) - time(a.startAt));

  return [...upcoming, ...past].slice(0, SEARCH_RESULT_LIMIT);
}

/** Whether the event's title, location, description, or course contains the term. */
export function eventMatchesSearch(event: CalendarEvent, term: string): boolean {
  const needle = normalizeSearchTerm(term).toLowerCase();

  if (!needle) {
    return false;
  }

  return [event.title, event.location, event.description, event.course?.name, event.course?.code].some((text) =>
    text?.toLowerCase().includes(needle)
  );
}
