import type { CalendarEvent } from '../../../models/CalendarEvent';
import {
  DEFAULT_CALENDAR_FILTERS,
  filterCalendarEvents,
  isFiltering,
  type CalendarFilters,
} from '../utils/calendarFilters';

// Times are in the phone's time zone.
const local = (day: number, hour = 0, minute = 0) => new Date(2026, 10, day, hour, minute).toISOString();

const event = (id: string, overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id,
  userId: 'user-1',
  title: id,
  startAt: local(18, 9),
  endAt: local(18, 10),
  source: 'rise',
  ...overrides,
});

const filters = (overrides: Partial<CalendarFilters>): CalendarFilters => ({
  ...DEFAULT_CALENDAR_FILTERS,
  ...overrides,
});

const ids = (events: CalendarEvent[]) => events.map((e) => e.id);

describe('filterCalendarEvents', () => {
  const chemLab = event('Chem Lab', { eventType: 'class' });
  const studyGroup = event('Study group', { eventType: 'study', source: 'google' });
  const dentist = event('Dentist', { source: 'apple' });
  const gym = event('Gym', { eventType: 'wellness', source: 'apple' });
  const all = [chemLab, studyGroup, dentist, gym];

  it('shows every event when nothing is filtered', () => {
    expect(filterCalendarEvents(all, DEFAULT_CALENDAR_FILTERS)).toBe(all);
  });

  it('hides the types that are turned off (AC2)', () => {
    expect(ids(filterCalendarEvents(all, filters({ hiddenTypes: ['class', 'study'] })))).toEqual(['Dentist', 'Gym']);
  });

  it('hides events with no type when "No type" is off', () => {
    expect(ids(filterCalendarEvents(all, filters({ hiddenTypes: ['none'] })))).toEqual([
      'Chem Lab',
      'Study group',
      'Gym',
    ]);
  });

  it('hides the sources that are turned off', () => {
    expect(ids(filterCalendarEvents(all, filters({ hiddenSources: ['apple'] })))).toEqual(['Chem Lab', 'Study group']);
  });

  it('shows only events that pass every filter (AC5)', () => {
    // Apple is off and Class is off: Gym and Dentist are Apple, Chem Lab is Class.
    expect(ids(filterCalendarEvents(all, filters({ hiddenTypes: ['class'], hiddenSources: ['apple'] })))).toEqual([
      'Study group',
    ]);
  });

  it('returns nothing when no event matches (AC8)', () => {
    expect(filterCalendarEvents(all, filters({ hiddenSources: ['rise', 'google', 'apple'] }))).toEqual([]);
  });

  describe('dates (AC4)', () => {
    const nov16 = event('Nov 16', { startAt: local(16, 9), endAt: local(16, 10) });
    const nov18 = event('Nov 18', { startAt: local(18, 23), endAt: local(18, 23, 30) });
    const nov20 = event('Nov 20', { startAt: local(20, 9), endAt: local(20, 10) });
    const days = [nov16, nov18, nov20];

    it('shows only events within the chosen days, including all of the last day', () => {
      const range = filters({ fromDate: new Date(2026, 10, 17), toDate: new Date(2026, 10, 18) });

      expect(ids(filterCalendarEvents(days, range))).toEqual(['Nov 18']);
    });

    it('works with only a start or only an end', () => {
      expect(ids(filterCalendarEvents(days, filters({ fromDate: new Date(2026, 10, 18) })))).toEqual(['Nov 18', 'Nov 20']);
      expect(ids(filterCalendarEvents(days, filters({ toDate: new Date(2026, 10, 18) })))).toEqual(['Nov 16', 'Nov 18']);
    });

    it('counts the day picked, whatever time of day it was picked at', () => {
      const range = filters({ fromDate: new Date(2026, 10, 18, 15), toDate: new Date(2026, 10, 18, 8) });

      expect(ids(filterCalendarEvents(days, range))).toEqual(['Nov 18']);
    });

    it('shows an event that crosses into the range, like a late-night one', () => {
      const lateNight = event('Late-night review', { startAt: local(17, 23), endAt: local(18, 1) });

      expect(ids(filterCalendarEvents([lateNight], filters({ fromDate: new Date(2026, 10, 18) })))).toEqual([
        'Late-night review',
      ]);
    });

    it('does not show an all-day event from the day before', () => {
      // Google all-day events end at the next midnight.
      const springBreak = event('Spring Break', { startAt: local(17), endAt: local(18) });

      expect(filterCalendarEvents([springBreak], filters({ fromDate: new Date(2026, 10, 18) }))).toEqual([]);
    });

    it('shows a zero-length event on its day', () => {
      const reminder = event('Reminder', { startAt: local(18), endAt: local(18) });

      expect(ids(filterCalendarEvents([reminder], filters({ fromDate: new Date(2026, 10, 18) })))).toEqual(['Reminder']);
    });
  });
});

describe('isFiltering', () => {
  it('is false by default, and true once anything would hide events', () => {
    expect(isFiltering(DEFAULT_CALENDAR_FILTERS)).toBe(false);
    expect(isFiltering(filters({ hiddenTypes: ['none'] }))).toBe(true);
    expect(isFiltering(filters({ hiddenSources: ['canvas'] }))).toBe(true);
    expect(isFiltering(filters({ fromDate: new Date(2026, 10, 18) }))).toBe(true);
    expect(isFiltering(filters({ toDate: new Date(2026, 10, 18) }))).toBe(true);
  });
});
