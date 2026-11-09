import type { Assignment } from '../../../repositories/assignmentsRepository';
import { sortByPriority } from './assignmentPriority';

const DAY_MS = 24 * 60 * 60 * 1000;

const OVERDUE_BEFORE_PAST_MS = 2 * DAY_MS;
const PAST_RETENTION_MS = 14 * DAY_MS;

/**
 * Determine when an assignment enters List's Past section.
 * Completed work enters immediately; unfinished work enters 2 days overdue.
 */
function getPastEntryTime(assignment: Assignment): number | null {
  if (assignment.completed) {
    const completedAt = assignment.completedAt?.getTime();

    return completedAt !== undefined && Number.isFinite(completedAt)
      ? completedAt
      : null;
  }

  const dueAt = assignment.dueAt?.getTime();

  return dueAt !== undefined && Number.isFinite(dueAt)
    ? dueAt + OVERDUE_BEFORE_PAST_MS
    : null;
}

/**
 * Split List assignments into current and Past.
 * Expired items are hidden from List, without deleting saved records.
 */
export function getAssignmentListSections(
  assignments: Assignment[],
  now: Date,
): {
  currentAssignments: Assignment[];
  pastAssignments: Assignment[];
} {
  const currentAssignments: Assignment[] = [];
  const pastAssignments: Assignment[] = [];
  const nowTime = now.getTime();

  for (const assignment of assignments) {
    const pastEntryTime = getPastEntryTime(assignment);

    if (assignment.completed) {
      // If a completion date is unavailable, keep it in Past rather than
      // guessing a date or accidentally hiding it.
      if (
        pastEntryTime === null ||
        nowTime < pastEntryTime + PAST_RETENTION_MS
      ) {
        pastAssignments.push(assignment);
      }

      continue;
    }

    if (pastEntryTime === null || nowTime < pastEntryTime) {
      currentAssignments.push(assignment);
      continue;
    }

    if (nowTime < pastEntryTime + PAST_RETENTION_MS) {
      pastAssignments.push(assignment);
    }
  }

  return {
    // Overdue work comes first, followed by upcoming work.
    currentAssignments: sortByPriority(currentAssignments),

    // Show the assignments that entered Past most recently first.
    pastAssignments: pastAssignments.sort((a, b) => {
      const aTime = getPastEntryTime(a) ?? Number.NEGATIVE_INFINITY;
      const bTime = getPastEntryTime(b) ?? Number.NEGATIVE_INFINITY;

      if (aTime !== bTime) {
        return aTime > bTime ? -1 : 1;
      }

      return a.title.localeCompare(b.title);
    }),
  };
}