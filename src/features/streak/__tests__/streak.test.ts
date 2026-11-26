import type { Assignment } from '../../../repositories/assignmentsRepository';
import { calculateStreak } from '../utils/streak';

// Wednesday, November 11, 2026 at 9 PM, local time.
const now = new Date(2026, 10, 11, 21, 0);

let nextId = 1;

function assignment(overrides: Partial<Assignment>): Assignment {
  return {
    id: `a${nextId++}`,
    title: 'Problem Set',
    description: null,
    dueAt: new Date(2026, 10, 10, 23, 59),
    completed: false,
    completedAt: null,
    source: 'canvas',
    courseName: 'Electrical Engineering',
    courseCode: 'EE 381',
    courseColor: '#8FA8F0',
    courseTint: '#E3E9FC',
    pointsPossible: null,
    htmlUrl: null,
    estimatedMinutes: 60,
    kind: 'homework',
    ...overrides,
  };
}

/** Turned in on November `day` at noon, due that night. */
function onTime(day: number) {
  return assignment({
    completed: true,
    completedAt: new Date(2026, 10, day, 12, 0),
    dueAt: new Date(2026, 10, day, 23, 59),
  });
}

describe('calculateStreak', () => {
  it('is 0 with no activity', () => {
    expect(calculateStreak([], now)).toMatchObject({ current: 0, longest: 0, totalWeeks: 0 });
  });

  it('adds one day for each day with an on-time submission', () => {
    expect(calculateStreak([onTime(8), onTime(9), onTime(10)], now)).toMatchObject({
      current: 3,
      longest: 3,
    });
  });

  it('counts several submissions on the same day once', () => {
    expect(calculateStreak([onTime(10), onTime(10), onTime(10)], now).current).toBe(1);
  });

  it('keeps the streak across days with nothing due or turned in', () => {
    expect(calculateStreak([onTime(2), onTime(10)], now).current).toBe(2);
  });

  it('breaks when an assignment is missed, keeping the longest streak', () => {
    const summary = calculateStreak(
      [
        onTime(5),
        onTime(6),
        onTime(7),
        assignment({ dueAt: new Date(2026, 10, 8, 23, 59) }),
        onTime(9),
        onTime(10),
      ],
      now,
    );

    expect(summary).toMatchObject({ current: 2, longest: 3 });
  });

  it('breaks when an assignment is turned in late', () => {
    const late = assignment({
      completed: true,
      dueAt: new Date(2026, 10, 9, 23, 59),
      completedAt: new Date(2026, 10, 10, 8, 0),
    });

    expect(calculateStreak([onTime(8), late], now).current).toBe(0);
  });

  it("doesn't break for unfinished work that isn't due yet", () => {
    const dueTonight = assignment({ dueAt: new Date(2026, 10, 11, 23, 59) });

    expect(calculateStreak([onTime(10), dueTonight], now).current).toBe(1);
  });

  it("doesn't break for unfinished assignments added in RISE", () => {
    const addedInRise = assignment({ source: 'rise', dueAt: new Date(2026, 10, 10, 23, 59) });

    expect(calculateStreak([onTime(9), onTime(10), addedInRise], now).current).toBe(2);
  });

  it('ignores assignments with no due date or no completion date', () => {
    expect(
      calculateStreak(
        [
          onTime(10),
          assignment({ dueAt: null }),
          assignment({ dueAt: null, completed: true, completedAt: new Date(2026, 10, 9) }),
          assignment({ completed: true, completedAt: null }),
        ],
        now,
      ).current,
    ).toBe(1);
  });

  it('counts the weeks, Monday to Sunday, with an on-time submission', () => {
    // Sunday the 1st and Monday the 2nd are in different weeks; the 3rd shares a week with the 2nd.
    expect(calculateStreak([onTime(1), onTime(2), onTime(3), onTime(10)], now).totalWeeks).toBe(3);
  });

  describe('streak resets (#11)', () => {
    // Due on November `day` at night and never turned in.
    const notDone = (day: number) => assignment({ dueAt: new Date(2026, 10, day, 23, 59) });

    it('is 0 when no streak has ended', () => {
      expect(calculateStreak([], now).lastBrokenStreak).toBe(0);
      expect(calculateStreak([onTime(9), onTime(10)], now).lastBrokenStreak).toBe(0);
      // A miss before any streak started doesn't count as one ending.
      expect(calculateStreak([notDone(8), onTime(10)], now).lastBrokenStreak).toBe(0);
    });

    it('remembers how long the streak was when it ended', () => {
      expect(
        calculateStreak([onTime(6), onTime(7), onTime(8), notDone(9)], now),
      ).toMatchObject({ current: 0, lastBrokenStreak: 3 });
    });

    it('keeps the ended streak through a second miss in a row', () => {
      expect(
        calculateStreak([onTime(6), onTime(7), notDone(8), notDone(9)], now).lastBrokenStreak,
      ).toBe(2);
    });

    it('starts a new streak with the next on-time assignment', () => {
      expect(
        calculateStreak([onTime(6), onTime(7), notDone(8), onTime(10)], now),
      ).toMatchObject({ current: 1, lastBrokenStreak: 2 });
    });
  });

  it('marks which days this week, Monday to Sunday, had an on-time submission', () => {
    const { week } = calculateStreak([onTime(8), onTime(9), onTime(11)], now);

    expect(week.map(({ date }) => date.getDate())).toEqual([9, 10, 11, 12, 13, 14, 15]);
    expect(week.map(({ submittedOnTime }) => submittedOnTime)).toEqual([
      true,
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
  });
});
