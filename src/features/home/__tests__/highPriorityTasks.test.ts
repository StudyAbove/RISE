import type { Assignment } from '../../../repositories/assignmentsRepository';
import { getHighPriorityTasks } from '../utils/highPriorityTasks';

// Monday, November 9, 2026 at 9 AM, local time.
const now = new Date(2026, 10, 9, 9, 0);

let nextId = 1;

function assignment(overrides: Partial<Assignment>): Assignment {
  return {
    id: `a${nextId++}`,
    title: 'Problem Set',
    description: null,
    dueAt: new Date(2026, 10, 9, 23, 59),
    completed: false,
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

function summarize(assignments: Assignment[]) {
  return getHighPriorityTasks(assignments, now).map(
    ({ assignment: { title }, reason }) => `${title} (${reason})`,
  );
}

describe('getHighPriorityTasks', () => {
  it('includes work due today or in the next 24 hours, soonest first', () => {
    expect(
      summarize([
        assignment({ title: 'Tomorrow morning', dueAt: new Date(2026, 10, 10, 8, 0) }),
        // Due earlier today and not done yet still counts.
        assignment({ title: 'Earlier today', dueAt: new Date(2026, 10, 9, 8, 0) }),
        assignment({ title: 'Tonight', dueAt: new Date(2026, 10, 9, 23, 59) }),
        // Exactly 24 hours from now counts; a minute later doesn't.
        assignment({ title: 'In 24 hours', dueAt: new Date(2026, 10, 10, 9, 0) }),
        assignment({ title: 'Too late', dueAt: new Date(2026, 10, 10, 9, 1) }),
      ]),
    ).toEqual([
      'Earlier today (dueSoon)',
      'Tonight (dueSoon)',
      'Tomorrow morning (dueSoon)',
      'In 24 hours (dueSoon)',
    ]);
  });

  it('leaves out finished work, work due before today, and work with no due date', () => {
    expect(
      summarize([
        assignment({ title: 'Done', completed: true }),
        assignment({ title: 'Yesterday', dueAt: new Date(2026, 10, 8, 23, 59) }),
        assignment({ title: 'No date', dueAt: null }),
      ]),
    ).toEqual([]);
  });

  it('suggests big work that has to be started within the next 2 days', () => {
    expect(
      summarize([
        // 10 hours at about 2 a day: due in 5 days, so start today.
        assignment({ title: 'Start today', dueAt: new Date(2026, 10, 14, 9, 0), estimatedMinutes: 600, kind: 'project' }),
        // 8 hours, due in 6 days: start in 2 days, so it's a heads-up now.
        assignment({ title: 'Start in 2 days', dueAt: new Date(2026, 10, 15, 9, 0), estimatedMinutes: 480, kind: 'project' }),
        // Due in 2 days but small, so it's never a get-ahead suggestion.
        assignment({ title: 'Small homework', dueAt: new Date(2026, 10, 11, 9, 0), estimatedMinutes: 60 }),
      ]),
    ).toEqual(['Start today (getAhead)', 'Start in 2 days (getAhead)']);
  });

  it('fills open cards with the next big work, even if it can wait', () => {
    expect(
      summarize([
        assignment({ title: 'Tonight', dueAt: new Date(2026, 10, 9, 23, 59) }),
        // Start by Nov 18 and Nov 19: no rush, but there's room for both.
        assignment({ title: 'Later project', dueAt: new Date(2026, 10, 23, 9, 0), estimatedMinutes: 600, kind: 'project' }),
        assignment({ title: 'Even later paper', dueAt: new Date(2026, 10, 21, 9, 0), estimatedMinutes: 240, kind: 'paper' }),
        // Due after 14 days, so not suggested yet.
        assignment({ title: 'Next month', dueAt: new Date(2026, 11, 10, 9, 0), estimatedMinutes: 600, kind: 'project' }),
      ]),
    ).toEqual(['Tonight (dueSoon)', 'Later project (getAhead)', 'Even later paper (getAhead)']);
  });

  it('only fills up to 3 cards, but keeps all work that needs starting soon', () => {
    const urgentBigWork = [1, 2, 3].map((day) =>
      assignment({ title: `Urgent ${day}`, dueAt: new Date(2026, 10, 12 + day, 9, 0), estimatedMinutes: 600, kind: 'project' }),
    );

    expect(
      summarize([
        ...urgentBigWork,
        assignment({ title: 'Later project', dueAt: new Date(2026, 10, 23, 9, 0), estimatedMinutes: 600, kind: 'project' }),
      ]),
    ).toEqual(['Urgent 1 (getAhead)', 'Urgent 2 (getAhead)', 'Urgent 3 (getAhead)']);
  });

  it('counts an exam as big work even with a short estimate', () => {
    expect(
      summarize([
        assignment({ title: 'Quiz-sized exam', dueAt: new Date(2026, 10, 10, 12, 0), estimatedMinutes: 120, kind: 'exam' }),
      ]),
    ).toEqual(['Quiz-sized exam (getAhead)']);
  });

  it('puts due-soon work before get-ahead suggestions', () => {
    expect(
      summarize([
        assignment({ title: 'Big project', dueAt: new Date(2026, 10, 12, 9, 0), estimatedMinutes: 480, kind: 'project' }),
        assignment({ title: 'Tonight', dueAt: new Date(2026, 10, 9, 23, 59) }),
      ]),
    ).toEqual(['Tonight (dueSoon)', 'Big project (getAhead)']);
  });

  it('returns nothing when there is nothing to do', () => {
    expect(summarize([])).toEqual([]);
  });
});
