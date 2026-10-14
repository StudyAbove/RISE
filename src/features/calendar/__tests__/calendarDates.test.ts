import { format } from 'date-fns';

import {
  getMonthGridDays,
  getTimeGridDays,
  getVisibleRange,
  shiftAnchorDate,
} from '../utils/calendarDates';

// Compare days as 'yyyy-MM-dd' strings so failures are easy to read.
const toDayStrings = (days: Date[]) => days.map((day) => format(day, 'yyyy-MM-dd'));

describe('getMonthGridDays', () => {
  it('pads a month that starts mid-week with days from the neighboring months', () => {
    // December 2026 starts on a Tuesday and ends on a Thursday.
    const days = toDayStrings(getMonthGridDays(new Date(2026, 11, 15)));

    expect(days).toHaveLength(35);
    expect(days[0]).toBe('2026-11-29');
    expect(days[2]).toBe('2026-12-01');
    expect(days[days.length - 1]).toBe('2027-01-02');
  });

  it('adds no leading days when the month starts on a Sunday', () => {
    const days = toDayStrings(getMonthGridDays(new Date(2026, 10, 13)));

    expect(days[0]).toBe('2026-11-01');
  });

  it('uses six rows when the month needs them', () => {
    // August 2026 starts on a Saturday and ends on a Monday.
    const days = getMonthGridDays(new Date(2026, 7, 1));

    expect(days).toHaveLength(42);
  });

  it('always starts each row on a Sunday', () => {
    const days = getMonthGridDays(new Date(2026, 1, 1));

    for (let row = 0; row < days.length; row += 7) {
      expect(days[row].getDay()).toBe(0);
    }
  });
});

describe('getTimeGridDays', () => {
  const friday = new Date(2026, 10, 13);

  it('shows the Sunday–Saturday week around the selected day', () => {
    expect(toDayStrings(getTimeGridDays('week', friday))).toEqual([
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
    ]);
  });

  it('shows the selected day and the next day for 2 Day', () => {
    expect(toDayStrings(getTimeGridDays('twoDay', friday))).toEqual([
      '2026-11-13',
      '2026-11-14',
    ]);
  });

  it('crosses into the next month for 2 Day at the end of a month', () => {
    expect(toDayStrings(getTimeGridDays('twoDay', new Date(2026, 10, 30)))).toEqual([
      '2026-11-30',
      '2026-12-01',
    ]);
  });

  it('shows only the selected day for Day', () => {
    expect(toDayStrings(getTimeGridDays('day', friday))).toEqual(['2026-11-13']);
  });
});

describe('getVisibleRange', () => {
  const friday = new Date(2026, 10, 13, 15, 45);
  const range = (view: Parameters<typeof getVisibleRange>[0]) => {
    const { start, end } = getVisibleRange(view, friday);
    return [format(start, 'yyyy-MM-dd HH:mm'), format(end, 'yyyy-MM-dd HH:mm')];
  };

  it('runs from midnight of the first visible day to midnight after the last', () => {
    // November 2026's grid is Nov 1 – Dec 5.
    expect(range('month')).toEqual(['2026-11-01 00:00', '2026-12-06 00:00']);
    expect(range('week')).toEqual(['2026-11-08 00:00', '2026-11-15 00:00']);
    expect(range('twoDay')).toEqual(['2026-11-13 00:00', '2026-11-15 00:00']);
    expect(range('day')).toEqual(['2026-11-13 00:00', '2026-11-14 00:00']);
  });
});

describe('shiftAnchorDate', () => {
  const day = (date: Date) => format(date, 'yyyy-MM-dd');
  const friday = new Date(2026, 10, 13);

  it('moves a month at a time across the year boundary', () => {
    expect(day(shiftAnchorDate('month', new Date(2026, 11, 13), 1))).toBe('2027-01-13');
    expect(day(shiftAnchorDate('month', new Date(2027, 0, 13), -1))).toBe('2026-12-13');
  });

  it('lands on the last day of a shorter month instead of skipping it', () => {
    expect(day(shiftAnchorDate('month', new Date(2027, 0, 31), 1))).toBe('2027-02-28');
  });

  it('moves a week, two days, or one day for the hourly views', () => {
    expect(day(shiftAnchorDate('week', friday, 1))).toBe('2026-11-20');
    expect(day(shiftAnchorDate('twoDay', friday, 1))).toBe('2026-11-15');
    expect(day(shiftAnchorDate('twoDay', friday, -1))).toBe('2026-11-11');
    expect(day(shiftAnchorDate('day', friday, -1))).toBe('2026-11-12');
  });
});
