import type { CalendarEvent } from '../../../models/CalendarEvent';
import {
  anyColumnContains,
  containsPattern,
  eventMatchesSearch,
  normalizeSearchTerm,
  orderSearchResults,
} from '../utils/calendarSearch';

describe('normalizeSearchTerm', () => {
  it('trims and collapses spaces', () => {
    expect(normalizeSearchTerm('  CECS   449 ')).toBe('CECS 449');
    expect(normalizeSearchTerm('   ')).toBe('');
  });
});

describe('containsPattern', () => {
  it('matches the term anywhere', () => {
    expect(containsPattern('lab')).toBe('%lab%');
  });

  it('takes %, _, and \\ literally', () => {
    expect(containsPattern('50%_a\\b')).toBe('%50\\%\\_a\\\\b%');
  });
});

describe('anyColumnContains', () => {
  it('builds one quoted ILIKE per column', () => {
    expect(anyColumnContains(['title', 'location'], 'lab')).toBe('title.ilike."%lab%",location.ilike."%lab%"');
  });

  it('keeps commas, dots, and parentheses inside the quotes', () => {
    expect(anyColumnContains(['title'], 'Ch. 3 (a,b)')).toBe('title.ilike."%Ch. 3 (a,b)%"');
  });

  it('escapes quotes and backslashes for the filter', () => {
    // The ILIKE pattern is %say "hi" 50\%%; quoting escapes its " and \ again.
    expect(anyColumnContains(['title'], 'say "hi" 50%')).toBe('title.ilike."%say \\"hi\\" 50\\\\%%"');
  });
});

describe('orderSearchResults', () => {
  const now = new Date('2026-11-13T12:00:00.000Z');
  const at = (id: string, start: string, end = start): CalendarEvent => ({
    id,
    userId: 'user-1',
    title: id,
    startAt: start,
    endAt: end,
    source: 'rise',
  });

  it('puts upcoming events first, soonest first, then past ones, most recent first', () => {
    const events = [
      at('last month', '2026-10-13T12:00:00.000Z'),
      at('next week', '2026-11-20T12:00:00.000Z'),
      at('yesterday', '2026-11-12T12:00:00.000Z'),
      at('tomorrow', '2026-11-14T12:00:00.000Z'),
      // Started an hour ago and still going, so it's upcoming.
      at('happening now', '2026-11-13T11:00:00.000Z', '2026-11-13T13:00:00.000Z'),
    ];

    expect(orderSearchResults(events, now).map((event) => event.id)).toEqual([
      'happening now',
      'tomorrow',
      'next week',
      'yesterday',
      'last month',
    ]);
  });

  it('keeps at most 50', () => {
    const many = Array.from({ length: 60 }, (_, day) => at(`day ${day}`, new Date(2026, 11, day + 1).toISOString()));

    expect(orderSearchResults(many, now)).toHaveLength(50);
  });
});

describe('eventMatchesSearch', () => {
  const event: CalendarEvent = {
    id: 'event-1',
    userId: 'user-1',
    title: 'CECS 449 Lecture',
    startAt: '2026-11-13T17:30:00.000Z',
    endAt: '2026-11-13T18:45:00.000Z',
    source: 'rise',
    location: 'ECS 304',
    description: 'Bring the lab notebook',
    course: { id: 'course-1', name: 'Software Engineering', code: 'CECS 491B' },
  };

  it.each([
    ['the title', 'lecture'],
    ['the location', 'ecs 304'],
    ['the description', 'NOTEBOOK'],
    ['the course name', 'software'],
    ['the course code', '491b'],
    ['part of a word', 'ectu'],
  ])('matches %s, ignoring case (AC2, AC3, AC4)', (_, term) => {
    expect(eventMatchesSearch(event, term)).toBe(true);
  });

  it('does not match other text, or an empty search', () => {
    expect(eventMatchesSearch(event, 'chemistry')).toBe(false);
    expect(eventMatchesSearch(event, '   ')).toBe(false);
  });

  it('works for an event with only a title', () => {
    const plain: CalendarEvent = { ...event, location: undefined, description: undefined, course: undefined };

    expect(eventMatchesSearch(plain, '449')).toBe(true);
    expect(eventMatchesSearch(plain, 'ECS 304')).toBe(false);
  });
});
