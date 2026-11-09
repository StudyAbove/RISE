import Storage from 'expo-sqlite/kv-store';

import { loadCalendarFilters, saveCalendarFilters } from '../services/calendarFilterStorage';
import { DEFAULT_CALENDAR_FILTERS } from '../utils/calendarFilters';

// The phone's key-value store, kept in memory.
const mockStore = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: jest.fn((key: string) => mockStore.get(key) ?? null),
    setItemSync: jest.fn((key: string, value: string) => {
      mockStore.set(key, value);
    }),
  },
}));

const mockStorage = jest.mocked(Storage);

beforeEach(() => {
  mockStore.clear();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('calendar filter storage (#79)', () => {
  it('shows everything when nothing has been saved', () => {
    expect(loadCalendarFilters()).toEqual(DEFAULT_CALENDAR_FILTERS);
  });

  it('brings back the saved type and source toggles', () => {
    saveCalendarFilters({
      ...DEFAULT_CALENDAR_FILTERS,
      hiddenTypes: ['class', 'none'],
      hiddenSources: ['google'],
    });

    expect(loadCalendarFilters()).toEqual({
      ...DEFAULT_CALENDAR_FILTERS,
      hiddenTypes: ['class', 'none'],
      hiddenSources: ['google'],
    });
  });

  it('brings back the saved course toggles (#159)', () => {
    saveCalendarFilters({ ...DEFAULT_CALENDAR_FILTERS, hiddenCourses: ['course-1', 'none'] });

    expect(loadCalendarFilters()).toEqual({ ...DEFAULT_CALENDAR_FILTERS, hiddenCourses: ['course-1', 'none'] });
  });

  it('keeps only text course ids, and loads older saves without courses', () => {
    mockStore.set('rise.calendarFilters', JSON.stringify({ hiddenTypes: [], hiddenSources: [], hiddenCourses: ['course-1', 7, null] }));
    expect(loadCalendarFilters().hiddenCourses).toEqual(['course-1']);

    mockStore.set('rise.calendarFilters', JSON.stringify({ hiddenTypes: ['class'], hiddenSources: [] }));
    expect(loadCalendarFilters()).toEqual({ ...DEFAULT_CALENDAR_FILTERS, hiddenTypes: ['class'] });
  });

  it('does not save the date range', () => {
    saveCalendarFilters({
      ...DEFAULT_CALENDAR_FILTERS,
      fromDate: new Date(2026, 10, 1),
      toDate: new Date(2026, 10, 15),
    });

    expect(loadCalendarFilters()).toEqual(DEFAULT_CALENDAR_FILTERS);
  });

  it('ignores types and sources RISE no longer knows', () => {
    mockStore.set(
      'rise.calendarFilters',
      JSON.stringify({ hiddenTypes: ['study', 'work'], hiddenSources: ['outlook', 'apple'] })
    );

    expect(loadCalendarFilters()).toMatchObject({ hiddenTypes: ['study'], hiddenSources: ['apple'] });
  });

  it.each([
    ['damaged JSON', '{not json'],
    ['the wrong shape', '"class"'],
    ['lists that are not lists', JSON.stringify({ hiddenTypes: 'class', hiddenSources: null })],
  ])('shows everything when the save has %s', (_, saved) => {
    mockStore.set('rise.calendarFilters', saved);

    expect(loadCalendarFilters()).toEqual(DEFAULT_CALENDAR_FILTERS);
  });

  it('shows everything when the store cannot be read', () => {
    mockStorage.getItemSync.mockImplementationOnce(() => {
      throw new Error('database is locked');
    });

    expect(loadCalendarFilters()).toEqual(DEFAULT_CALENDAR_FILTERS);
  });

  it('does not crash when the store cannot be written', () => {
    mockStorage.setItemSync.mockImplementationOnce(() => {
      throw new Error('disk full');
    });

    expect(() => saveCalendarFilters({ ...DEFAULT_CALENDAR_FILTERS, hiddenTypes: ['class'] })).not.toThrow();
  });
});
