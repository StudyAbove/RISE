import { addDays, endOfDay, startOfDay } from 'date-fns';

import { getAssignmentEstimate } from '../../assignments/utils/assignmentEstimate';
import { getStartBy, type StudyMinutesOn } from '../../assignments/utils/startBy';
import type { Assignment } from '../../../repositories/assignmentsRepository';
import { getStudyMinutesOn } from './dailyStudyTime';

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

// Suggest big work this many days before it has to be started, as a heads-up.
const HEADS_UP_DAYS = 2;

/** Unfinished work due any time today, or within the next 24 hours. */
function isDueSoon(dueAt: Date, now: Date) {
  const dueSoonEnd = now.getTime() + DUE_SOON_HOURS * 60 * 60 * 1000;
  const time = dueAt.getTime();

  return time >= startOfDay(now).getTime() && time <= dueSoonEnd;
}

/** Big (3+ hours, or an exam) and due within the next 14 days. */
function isUpcomingBigWork(assignment: Assignment, dueAt: Date, now: Date) {
  if (dueAt.getTime() > addDays(now, GET_AHEAD_DAYS).getTime()) return false;

  const { minutes, kind } = getAssignmentEstimate(assignment);
  return minutes >= BIG_WORK_MINUTES || kind === 'exam';
}

function startByTime(
  assignment: Assignment & { dueAt: Date },
  studyMinutesOn: StudyMinutesOn,
) {
  const { minutes } = getAssignmentEstimate(assignment);
  return getStartBy(assignment.dueAt, minutes, studyMinutesOn).getTime();
}

/**
 * Due-soon work first (soonest due first), then get-ahead suggestions
 * (whichever needs starting first):
 * - all big work that has to be started within the next 2 days, and
 * - if there are still fewer than 3 tasks, the next big work after that,
 *   even if it doesn't need starting yet.
 *
 * Busy days on the calendar (`eventMinutesByDay`, see getEventMinutesByDay)
 * give less study time, so big work due after them is suggested sooner.
 *
 * Until microtasks exist (#42), a get-ahead suggestion is the whole
 * assignment. Once they do, show the assignment's next microtask instead.
 */
export function getHighPriorityTasks(
  assignments: Assignment[],
  now: Date,
  eventMinutesByDay: Map<number, number> = new Map(),
): HighPriorityTask[] {
  const studyMinutesOn = getStudyMinutesOn(eventMinutesByDay);
  const startBy = (assignment: Assignment & { dueAt: Date }) =>
    startByTime(assignment, studyMinutesOn);

  const dueSoon: (Assignment & { dueAt: Date })[] = [];
  const bigWork: (Assignment & { dueAt: Date })[] = [];

  for (const assignment of assignments) {
    const { dueAt } = assignment;

    if (assignment.completed || !dueAt) continue;

    if (isDueSoon(dueAt, now)) {
      dueSoon.push({ ...assignment, dueAt });
    } else if (dueAt.getTime() > now.getTime() && isUpcomingBigWork(assignment, dueAt, now)) {
      bigWork.push({ ...assignment, dueAt });
    }
  }

  dueSoon.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  bigWork.sort((a, b) => startBy(a) - startBy(b));

  const headsUpEnd = endOfDay(addDays(now, HEADS_UP_DAYS)).getTime();
  const getAhead = bigWork.filter(
    (assignment, index) =>
      startBy(assignment) <= headsUpEnd ||
      dueSoon.length + index < MAX_HIGH_PRIORITY_TASKS,
  );

  return [
    ...dueSoon.map((assignment) => ({ assignment, reason: 'dueSoon' as const })),
    ...getAhead.map((assignment) => ({ assignment, reason: 'getAhead' as const })),
  ];
}
