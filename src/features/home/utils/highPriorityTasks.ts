import { addDays, endOfDay, startOfDay } from 'date-fns';

import { getAssignmentEstimate } from '../../assignments/utils/assignmentEstimate';
import { getStartBy } from '../../assignments/utils/startBy';
import type { Assignment } from '../../../repositories/assignmentsRepository';

/**
 * High Priority Tasks on Home (#58): what's due soon, then big work that
 * needs to be started now to get ahead.
 */

export type HighPriorityReason = 'dueSoon' | 'getAhead';

export type HighPriorityTask = {
  assignment: Assignment;
  reason: HighPriorityReason;
};

// How many cards Home shows; View all opens List for the rest.
export const MAX_HIGH_PRIORITY_TASKS = 3;

const DUE_SOON_HOURS = 24;

// Get-ahead suggestions: work at least this big, due within this many days.
const BIG_WORK_MINUTES = 3 * 60;
const GET_AHEAD_DAYS = 14;

/** Unfinished work due any time today, or within the next 24 hours. */
function isDueSoon(dueAt: Date, now: Date) {
  const dueSoonEnd = now.getTime() + DUE_SOON_HOURS * 60 * 60 * 1000;
  const time = dueAt.getTime();

  return time >= startOfDay(now).getTime() && time <= dueSoonEnd;
}

/**
 * Due later, big (3+ hours, or an exam), and has to be started today to be
 * finished on time.
 */
function shouldGetAhead(assignment: Assignment, dueAt: Date, now: Date) {
  if (dueAt.getTime() > addDays(now, GET_AHEAD_DAYS).getTime()) return false;

  const { minutes, kind } = getAssignmentEstimate(assignment);
  const isBig = minutes >= BIG_WORK_MINUTES || kind === 'exam';

  return isBig && getStartBy(dueAt, minutes).getTime() <= endOfDay(now).getTime();
}

function startByTime(assignment: Assignment & { dueAt: Date }) {
  return getStartBy(assignment.dueAt, getAssignmentEstimate(assignment).minutes).getTime();
}

/**
 * Due-soon work first (soonest due first), then get-ahead suggestions
 * (whichever needs starting first). Not capped; Home shows the first few.
 *
 * Until microtasks exist (#42), a get-ahead suggestion is the whole
 * assignment. Once they do, show the assignment's next microtask instead.
 */
export function getHighPriorityTasks(
  assignments: Assignment[],
  now: Date,
): HighPriorityTask[] {
  const dueSoon: (Assignment & { dueAt: Date })[] = [];
  const getAhead: (Assignment & { dueAt: Date })[] = [];

  for (const assignment of assignments) {
    const { dueAt } = assignment;

    if (assignment.completed || !dueAt) continue;

    if (isDueSoon(dueAt, now)) {
      dueSoon.push({ ...assignment, dueAt });
    } else if (dueAt.getTime() > now.getTime() && shouldGetAhead(assignment, dueAt, now)) {
      getAhead.push({ ...assignment, dueAt });
    }
  }

  dueSoon.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  getAhead.sort((a, b) => startByTime(a) - startByTime(b));

  return [
    ...dueSoon.map((assignment) => ({ assignment, reason: 'dueSoon' as const })),
    ...getAhead.map((assignment) => ({ assignment, reason: 'getAhead' as const })),
  ];
}
