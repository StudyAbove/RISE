import type { CalendarEvent } from '../../../models/CalendarEvent';
import { getTimeGridDays, getVisibleRange } from '../utils/calendarDates';
import { getDaySegments } from '../utils/calendarEvents';

// Builds an event from local clock times, stored as UTC ISO strings like Supabase returns.
function makeEvent(title: string, start: Date, end: Date): CalendarEvent {
  return {
    id: title,
    userId: 'user-1',
    title,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    source: 'rise',
  };
}

const friday = new Date(2026, 10, 13);
const saturday = new Date(2026, 10, 14);

describe('getDaySegments', () => {
  it('places an event at its local clock time', () => {
    const lab = makeEvent('Lab', new Date(2026, 10, 13, 14, 30), new Date(2026, 10, 13, 16, 0));

    expect(getDaySegments([lab], friday)).toEqual([{ event: lab, startMinute: 870, endMinute: 960 }]);
  });

  it('leaves out events on other days', () => {
    const lab = makeEvent('Lab', new Date(2026, 10, 13, 14, 30), new Date(2026, 10, 13, 16, 0));

    expect(getDaySegments([lab], saturday)).toEqual([]);
  });

  it('splits an event that crosses midnight across both days', () => {
    const review = makeEvent('Review', new Date(2026, 10, 13, 23, 30), new Date(2026, 10, 14, 1, 0));

    expect(getDaySegments([review], friday)).toEqual([{ event: review, startMinute: 1410, endMinute: 1440 }]);
    expect(getDaySegments([review], saturday)).toEqual([{ event: review, startMinute: 0, endMinute: 60 }]);
  });

  it('does not show an event on the next day when it ends exactly at midnight', () => {
    const lateClass = makeEvent('Late class', new Date(2026, 10, 13, 22, 0), new Date(2026, 10, 14, 0, 0));

    expect(getDaySegments([lateClass], friday)).toEqual([{ event: lateClass, startMinute: 1320, endMinute: 1440 }]);
    expect(getDaySegments([lateClass], saturday)).toEqual([]);
  });

  it('fills the whole middle day of a multi-day event', () => {
    const trip = makeEvent('Field trip', new Date(2026, 10, 12, 18, 0), new Date(2026, 10, 14, 9, 0));

    expect(getDaySegments([trip], friday)).toEqual([{ event: trip, startMinute: 0, endMinute: 1440 }]);
  });

  it('keeps a zero-length event on its day', () => {
    const due = makeEvent('Due', new Date(2026, 10, 13, 23, 59), new Date(2026, 10, 13, 23, 59));

    expect(getDaySegments([due], friday)).toEqual([{ event: due, startMinute: 1439, endMinute: 1439 }]);
  });

  it('lists events earliest first, longer first when they start together', () => {
    const short = makeEvent('Short', new Date(2026, 10, 13, 9, 0), new Date(2026, 10, 13, 9, 30));
    const long = makeEvent('Long', new Date(2026, 10, 13, 9, 0), new Date(2026, 10, 13, 11, 0));
    const early = makeEvent('Early', new Date(2026, 10, 13, 8, 0), new Date(2026, 10, 13, 8, 30));

    expect(getDaySegments([short, long, early], friday).map(({ event }) => event.title)).toEqual([
      'Early',
      'Long',
      'Short',
    ]);
  });

  it('puts an event on the same date and time in every view (AC6)', () => {
    const lab = makeEvent('Lab', new Date(2026, 10, 13, 14, 30), new Date(2026, 10, 13, 16, 0));
    const expected = [{ event: lab, startMinute: 870, endMinute: 960 }];

    for (const view of ['week', 'twoDay', 'day'] as const) {
      const shownFriday = getTimeGridDays(view, friday).find((day) => day.getDate() === 13);
      expect(getDaySegments([lab], shownFriday!)).toEqual(expected);
    }

    // The month view loads the whole grid, which includes the event.
    const { start, end } = getVisibleRange('month', friday);
    expect(new Date(lab.startAt) >= start && new Date(lab.endAt) <= end).toBe(true);
  });
});
