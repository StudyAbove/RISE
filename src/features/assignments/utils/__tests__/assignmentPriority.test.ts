import type { Assignment } from '../../../../repositories/assignmentsRepository';
import {
  getPriorityLevel,
  isPastAssignment,
  sortByPriority,
} from '../assignmentPriority';

// Monday, Nov 9 2026 at noon.
const now = new Date(2026, 10, 9, 12, 0);
const day = (date: number, hour = 23, minute = 59) =>
  new Date(2026, 10, date, hour, minute);

function assignment(overrides: Partial<Assignment>): Assignment {
  return {
    id: 'a1',
    title: 'Problem Set',
    description: null,
    dueAt: day(20),
    completed: false,
    source: 'canvas',
    courseName: null,
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

describe('getPriorityLevel', () => {
  it('marks unfinished work past its due date as overdue', () => {
    expect(getPriorityLevel(assignment({ dueAt: day(8) }), now)).toBe('overdue');
  });

  it('marks work due within 24 hours as high', () => {
    expect(getPriorityLevel(assignment({ dueAt: day(10, 9) }), now)).toBe('high');
  });

  it('marks an exam due within 7 days as high', () => {
    expect(
      getPriorityLevel(assignment({ dueAt: day(16, 9), kind: 'exam' }), now),
    ).toBe('high');
    expect(
      getPriorityLevel(assignment({ dueAt: day(20), kind: 'exam' }), now),
    ).not.toBe('high');
  });

  it('marks 5+ hours of work due within 3 days as high', () => {
    expect(
      getPriorityLevel(assignment({ dueAt: day(12, 9), estimatedMinutes: 300 }), now),
    ).toBe('high');
  });

  it('marks work as high when it should already be started', () => {
    // 8 hours of work due in 3.5 days needs 4 days at 2 hours a day.
    expect(
      getPriorityLevel(
        assignment({ dueAt: day(13, 0, 0), estimatedMinutes: 8 * 60, kind: 'paper' }),
        now,
      ),
    ).toBe('high');
  });

  it('marks smaller work due within 5 days as medium', () => {
    expect(getPriorityLevel(assignment({ dueAt: day(13, 9) }), now)).toBe('medium');
  });

  it('marks work due later as low', () => {
    expect(getPriorityLevel(assignment({ dueAt: day(20) }), now)).toBe('low');
  });

  it('says when there is no due date', () => {
    expect(getPriorityLevel(assignment({ dueAt: null }), now)).toBe('noDueDate');
  });
});

describe('isPastAssignment', () => {
  it('hides completed work, even if it is due later', () => {
    expect(isPastAssignment(assignment({ completed: true }), now)).toBe(true);
  });

  it('keeps unfinished work for a week after it was due', () => {
    expect(isPastAssignment(assignment({ dueAt: day(3) }), now)).toBe(false);
    expect(isPastAssignment(assignment({ dueAt: day(1) }), now)).toBe(true);
  });

  it('keeps work with no due date', () => {
    expect(isPastAssignment(assignment({ dueAt: null }), now)).toBe(false);
  });
});

describe('sortByPriority', () => {
  it('puts overdue first, then soonest due, then no due date', () => {
    const sorted = sortByPriority([
      assignment({ id: 'later', title: 'Later', dueAt: day(20) }),
      assignment({ id: 'none', title: 'No Date', dueAt: null }),
      assignment({ id: 'overdue', title: 'Overdue', dueAt: day(8) }),
      assignment({ id: 'soon', title: 'Soon', dueAt: day(10) }),
    ]);

    expect(sorted.map((a) => a.id)).toEqual(['overdue', 'soon', 'later', 'none']);
  });

  it('puts the bigger assignment first when two are due at the same time', () => {
    const sorted = sortByPriority([
      assignment({ id: 'small', estimatedMinutes: 30 }),
      assignment({ id: 'big', estimatedMinutes: 240 }),
    ]);

    expect(sorted.map((a) => a.id)).toEqual(['big', 'small']);
  });
});
