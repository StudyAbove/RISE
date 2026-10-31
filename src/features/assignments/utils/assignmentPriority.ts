import { addDays, addHours } from 'date-fns';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import { getAssignmentEstimate } from './assignmentEstimate';
import { getStartBy } from './startBy';

/**
 * How urgent each assignment is, for List and Study (#86). Ranks by due
 * date and uses the Claude time estimate, so big work moves up early.
 */

export type PriorityLevel = 'overdue' | 'high' | 'medium' | 'low' | 'noDueDate';

// Unfinished work stops showing as Overdue after this many days. Canvas only
// marks work done when something is submitted, so readings and in-class work
// would otherwise stay Overdue all semester.
export const OVERDUE_DAYS = 7;

const DUE_SOON_HOURS = 24;

// High this many days before it's due: exams, and other work of 5+ hours.
const EXAM_DAYS = 7;
const BIG_WORK_MINUTES = 5 * 60;
const BIG_WORK_DAYS = 3;

const MEDIUM_DAYS = 5;

/** Done, or overdue for over a week. Hidden unless "Show past" is on. */
export function isPastAssignment(assignment: Assignment, now: Date): boolean {
  if (assignment.completed) return true;
  if (assignment.dueAt === null) return false;

  return assignment.dueAt < addDays(now, -OVERDUE_DAYS);
}

export function getPriorityLevel(assignment: Assignment, now: Date): PriorityLevel {
  const { dueAt } = assignment;

  if (dueAt === null) return 'noDueDate';
  if (dueAt < now) return 'overdue';
  if (dueAt <= addHours(now, DUE_SOON_HOURS)) return 'high';

  const { minutes, kind } = getAssignmentEstimate(assignment);
  if (kind === 'exam' && dueAt <= addDays(now, EXAM_DAYS)) return 'high';
  if (minutes >= BIG_WORK_MINUTES && dueAt <= addDays(now, BIG_WORK_DAYS)) {
    return 'high';
  }

  // The work takes up most of the time left, so it should already be started.
  if (getStartBy(dueAt, minutes) <= now) return 'high';

  if (dueAt <= addDays(now, MEDIUM_DAYS)) return 'medium';

  return 'low';
}

/**
 * Overdue first, then soonest due. When two are due at the same time, the
 * bigger one goes first. No due date goes last.
 */
export function sortByPriority(assignments: Assignment[]): Assignment[] {
  return [...assignments].sort((a, b) => {
    if (a.dueAt === null || b.dueAt === null) {
      if (a.dueAt === b.dueAt) return a.title.localeCompare(b.title);
      return a.dueAt === null ? 1 : -1;
    }

    const byDueDate = a.dueAt.getTime() - b.dueAt.getTime();
    if (byDueDate !== 0) return byDueDate;

    const bySize =
      getAssignmentEstimate(b).minutes - getAssignmentEstimate(a).minutes;
    if (bySize !== 0) return bySize;

    return a.title.localeCompare(b.title);
  });
}
