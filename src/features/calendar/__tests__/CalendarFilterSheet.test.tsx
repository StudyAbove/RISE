import { fireEvent, render, screen } from '@testing-library/react-native';

import { CalendarFilterSheet } from '../components/filters/CalendarFilterSheet';

// The student's synced classes for the Courses rows (#159); none unless a test says otherwise.
const mockFetchCanvasCourses = jest.fn();
jest.mock('../../../repositories/canvasRepository', () => ({
  fetchCanvasCourses: () => mockFetchCanvasCourses(),
}));
import { DEFAULT_CALENDAR_FILTERS, type CalendarFilters } from '../utils/calendarFilters';

async function renderSheet(filters: CalendarFilters = DEFAULT_CALENDAR_FILTERS) {
  const onApply = jest.fn();
  await render(<CalendarFilterSheet visible filters={filters} onApply={onApply} onClose={jest.fn()} />);
  return { onApply };
}

const applied = (onApply: jest.Mock): CalendarFilters => onApply.mock.calls[0][0];

// Pin "today" to Friday, November 13, 2026, so the date picker opens on November.
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 10, 13, 9, 30) });
  mockFetchCanvasCourses.mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CalendarFilterSheet (#79)', () => {
  it('lists the Figma types, then No type, the sources, and the dates, all shown at first', async () => {
    await renderSheet();

    for (const name of [
      'Classes',
      'Assignments',
      'Study sessions',
      'Personal',
      'Wellness',
      'No type',
      'RISE',
      'Google Calendar',
      'Apple Calendar',
      'Canvas',
    ]) {
      expect(screen.getByRole('switch', { name, checked: true })).toBeOnTheScreen();
    }
    expect(screen.getByRole('button', { name: 'From, Any date' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'To, Any date' })).toBeOnTheScreen();
  });

  it('starts from the filters already in use', async () => {
    await renderSheet({ ...DEFAULT_CALENDAR_FILTERS, hiddenTypes: ['study'], hiddenSources: ['canvas'] });

    expect(screen.getByRole('switch', { name: 'Study sessions', checked: false })).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Canvas', checked: false })).toBeOnTheScreen();
  });

  it('turns a hidden type back on', async () => {
    const { onApply } = await renderSheet({ ...DEFAULT_CALENDAR_FILTERS, hiddenTypes: ['study', 'none'] });

    await fireEvent.press(screen.getByRole('switch', { name: 'Study sessions' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    expect(applied(onApply).hiddenTypes).toEqual(['none']);
  });

  it('picks a date range, and clears one end of it', async () => {
    const { onApply } = await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'From, Any date' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Monday, November 16' }));
    await fireEvent.press(screen.getByRole('button', { name: 'To, Any date' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Friday, November 20' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Clear From date' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    expect(applied(onApply)).toMatchObject({ fromDate: null, toDate: new Date(2026, 10, 20) });
  });

  it('keeps From before To by moving the other end along', async () => {
    const { onApply } = await renderSheet({
      ...DEFAULT_CALENDAR_FILTERS,
      fromDate: new Date(2026, 10, 16),
      toDate: new Date(2026, 10, 18),
    });

    // A From after To moves To up to it.
    await fireEvent.press(screen.getByRole('button', { name: 'From, Monday, November 16, 2026' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Friday, November 20' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    expect(applied(onApply)).toMatchObject({ fromDate: new Date(2026, 10, 20), toDate: new Date(2026, 10, 20) });
  });
});

describe('CalendarFilterSheet: courses (#159)', () => {
  const courses = [
    { id: 'cecs-491b', name: 'Software Engineering', code: 'CECS 491B', color: 'sunbeam', syncEnabled: true },
    { id: 'hist-110', name: 'US History', code: null, color: 'mint', syncEnabled: true },
    { id: 'art-101', name: 'Drawing', code: 'ART 101', color: 'coral', syncEnabled: false },
  ];

  it('lists each synced course, then All other courses, all checked at first', async () => {
    mockFetchCanvasCourses.mockResolvedValue(courses);
    await renderSheet();

    expect(await screen.findByRole('header', { name: 'Courses' })).toBeOnTheScreen();
    for (const name of ['CECS 491B', 'US History', 'All other courses']) {
      expect(screen.getByRole('checkbox', { name, checked: true })).toBeOnTheScreen();
    }
    // A class the student stopped syncing isn't offered.
    expect(screen.queryByRole('checkbox', { name: 'ART 101' })).not.toBeOnTheScreen();
  });

  it('hides the unchecked courses on Done', async () => {
    mockFetchCanvasCourses.mockResolvedValue(courses);
    const { onApply } = await renderSheet();

    await fireEvent.press(await screen.findByRole('checkbox', { name: 'CECS 491B' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'All other courses' }));
    expect(screen.getByRole('checkbox', { name: 'CECS 491B', checked: false })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    expect(applied(onApply).hiddenCourses).toEqual(['cecs-491b', 'none']);
  });

  it('starts from the courses already hidden', async () => {
    mockFetchCanvasCourses.mockResolvedValue(courses);
    await renderSheet({ ...DEFAULT_CALENDAR_FILTERS, hiddenCourses: ['hist-110'] });

    expect(await screen.findByRole('checkbox', { name: 'US History', checked: false })).toBeOnTheScreen();
  });

  it.each([
    ['there are no courses', () => mockFetchCanvasCourses.mockResolvedValue([])],
    ['the courses cannot be loaded', () => mockFetchCanvasCourses.mockRejectedValue(new Error('offline'))],
  ])('leaves out the Courses section when %s', async (_, setUp) => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    setUp();
    await renderSheet();

    expect(await screen.findByRole('switch', { name: 'Classes' })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Courses' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('checkbox', { name: 'All other courses' })).not.toBeOnTheScreen();
  });
});
