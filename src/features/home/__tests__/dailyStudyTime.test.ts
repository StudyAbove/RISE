import type { CalendarEvent } from '../../../models/CalendarEvent';
import { getStartBy } from '../../assignments/utils/startBy';
import {
  getEventMinutesByDay,
  getStudyMinutesOn,
  studyMinutesForEventMinutes,
} from '../utils/dailyStudyTime';

let nextId = 1;

function event(start: Date, end: Date, overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: `e${nextId++}`,
    userId: 'student',
    title: 'Event',
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    source: 'rise',
    ...overrides,
  };
}

const day = (date: number, hour = 0, minute = 0) => new Date(2026, 10, date, hour, minute);
const midnight = (date: number) => day(date).getTime();

describe('getEventMinutesByDay', () => {
  it('adds up each day, counting overlapping events once', () => {
    const minutes = getEventMinutesByDay([
      event(day(10, 9), day(10, 11)),
      // Overlaps the first event by an hour.
      event(day(10, 10), day(10, 12)),
      event(day(11, 13), day(11, 14)),
    ]);

    expect(minutes.get(midnight(10))).toBe(180);
    expect(minutes.get(midnight(11))).toBe(60);
  });

  it('splits an event that runs past midnight between the two days', () => {
    const minutes = getEventMinutesByDay([event(day(10, 23), day(11, 1))]);

    expect(minutes.get(midnight(10))).toBe(60);
    expect(minutes.get(midnight(11))).toBe(60);
  });

  it("doesn't count all-day events or study blocks as busy", () => {
    const minutes = getEventMinutesByDay([
      event(day(10), day(11), { title: 'Holiday' }),
      event(day(12, 14), day(12, 17), { eventType: 'study' }),
    ]);

    expect(minutes.size).toBe(0);
  });
});

describe('studyMinutesForEventMinutes', () => {
  it('gives 2 hours on a normal day, 1 on a busy day, and none on a full day', () => {
    expect(studyMinutesForEventMinutes(5 * 60)).toBe(120);
    expect(studyMinutesForEventMinutes(6 * 60)).toBe(60);
    expect(studyMinutesForEventMinutes(10 * 60)).toBe(0);
  });
});

describe('getStartBy with the calendar', () => {
  // 4 hours of work due Friday at 9 AM.
  const dueAt = day(13, 9);

  it('needs 2 days of work on normal days', () => {
    expect(getStartBy(dueAt, 240)).toEqual(day(11, 9));
  });

  it('starts earlier when the days before are busy', () => {
    const studyMinutesOn = getStudyMinutesOn(
      // Thursday is fully booked, Wednesday is busy.
      new Map([
        [midnight(12), 11 * 60],
        [midnight(11), 7 * 60],
      ]),
    );

    // Thursday gives nothing, Wednesday 1 hour, Tuesday 2, Monday the rest.
    expect(getStartBy(dueAt, 240, studyMinutesOn)).toEqual(day(9, 9));
  });
});
