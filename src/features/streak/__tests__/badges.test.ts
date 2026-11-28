import type { Assignment } from '../../../repositories/assignmentsRepository';
import { getBadges } from '../utils/badges';

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

/** Turned in `daysAgo` days before November 11 at noon, due that night. */
function onTime(daysAgo: number) {
  return assignment({
    completed: true,
    completedAt: new Date(2026, 10, 11 - daysAgo, 12, 0),
    dueAt: new Date(2026, 10, 11 - daysAgo, 23, 59),
  });
}

/** `count` on-time assignments, one a day, the newest today. */
function onTimeInARow(count: number) {
  return Array.from({ length: count }, (_, index) => onTime(index));
}

function summarize(assignments: Assignment[]) {
  return getBadges(assignments, now).map(({ milestone, earnedAt, progress }) => ({
    milestone,
    earned: earnedAt !== null,
    progress,
  }));
}

describe('getBadges', () => {
  it('starts with all three locked', () => {
    expect(summarize([])).toEqual([
      { milestone: 5, earned: false, progress: 0 },
      { milestone: 10, earned: false, progress: 0 },
      { milestone: 25, earned: false, progress: 0 },
    ]);
  });

  it('earns the 5 badge on the fifth on-time assignment', () => {
    expect(summarize(onTimeInARow(4))[0]).toEqual({ milestone: 5, earned: false, progress: 4 });
    expect(summarize(onTimeInARow(5))[0]).toEqual({ milestone: 5, earned: true, progress: 5 });
  });

  it('earns the 10 and 25 badges at 10 and 25', () => {
    expect(summarize(onTimeInARow(18))).toEqual([
      { milestone: 5, earned: true, progress: 5 },
      { milestone: 10, earned: true, progress: 10 },
      { milestone: 25, earned: false, progress: 18 },
    ]);
    expect(summarize(onTimeInARow(25))[2]).toEqual({ milestone: 25, earned: true, progress: 25 });
  });

  it('dates each badge by the assignment that earned it', () => {
    // Oldest is 9 days ago, so the fifth was turned in 5 days ago (Nov 6).
    const [five, ten] = getBadges(onTimeInARow(10), now);

    expect(five.earnedAt).toEqual(new Date(2026, 10, 6, 12, 0));
    expect(ten.earnedAt).toEqual(new Date(2026, 10, 11, 12, 0));
  });

  it('counts assignments, not days', () => {
    const sameDay = Array.from({ length: 5 }, () => onTime(0));

    expect(summarize(sameDay)[0].earned).toBe(true);
  });

  it("doesn't count late work", () => {
    const late = Array.from({ length: 5 }, (_, index) =>
      assignment({
        completed: true,
        dueAt: new Date(2026, 10, 1 + index, 23, 59),
        completedAt: new Date(2026, 10, 2 + index, 9, 0),
      }),
    );

    expect(summarize([...late, ...onTimeInARow(4)])[0]).toEqual({
      milestone: 5,
      earned: false,
      progress: 4,
    });
  });

  it('keeps badges after a missed assignment', () => {
    const missed = assignment({ dueAt: new Date(2026, 10, 11, 8, 0) });

    expect(summarize([...onTimeInARow(5), missed])[0].earned).toBe(true);
  });
});
