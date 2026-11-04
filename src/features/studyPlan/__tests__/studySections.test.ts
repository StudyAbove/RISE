import type { Assignment } from '../../../repositories/assignmentsRepository';
import { getStudySections } from '../utils/studySections';

// Monday, Nov 9 2026 at noon.
const now = new Date(2026, 10, 9, 12, 0);

function assignment(id: string, overrides: Partial<Assignment>): Assignment {
  return {
    id,
    title: id,
    description: null,
    dueAt: null,
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

const ids = (assignments: Assignment[]) => assignments.map((a) => a.id);

describe('getStudySections', () => {
  it('splits unfinished work into overdue, due today, and the next 7 days', () => {
    const sections = getStudySections(
      [
        assignment('nextWeek', { dueAt: new Date(2026, 10, 15, 9) }),
        assignment('tonight', { dueAt: new Date(2026, 10, 9, 23, 59) }),
        assignment('thisMorning', { dueAt: new Date(2026, 10, 9, 9) }),
        assignment('tomorrow', { dueAt: new Date(2026, 10, 10, 9) }),
        assignment('later', { dueAt: new Date(2026, 10, 20) }),
      ],
      now,
    );

    expect(ids(sections.overdue)).toEqual(['thisMorning']);
    expect(ids(sections.dueToday)).toEqual(['tonight']);
    expect(ids(sections.upcoming)).toEqual(['tomorrow', 'nextWeek']);
  });

  it('leaves out completed work, old overdue work, and no due date', () => {
    const sections = getStudySections(
      [
        assignment('done', { dueAt: new Date(2026, 10, 9, 23), completed: true }),
        assignment('weekOne', { dueAt: new Date(2026, 8, 1) }),
        assignment('noDate', { dueAt: null }),
      ],
      now,
    );

    expect(sections).toEqual({ overdue: [], dueToday: [], upcoming: [] });
  });
});
