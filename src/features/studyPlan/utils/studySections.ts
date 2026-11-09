import { addDays, endOfDay } from 'date-fns';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import {
  isPastAssignment,
  sortByPriority,
} from '../../assignments/utils/assignmentPriority';

/** How far ahead Upcoming looks, matching the Weekly Forecast on Home. */
export const UPCOMING_DAYS = 7;

export type StudySections = {
  overdue: Assignment[];
  dueToday: Assignment[];
  upcoming: Assignment[];
};

/**
 * Unfinished work on the Study page (#86), each section most urgent first.
 * Later work, and work with no due date, is only on List.
 */
export function getStudySections(
  assignments: Assignment[],
  now: Date,
): StudySections {
  const todayEnd = endOfDay(now);
  const upcomingEnd = endOfDay(addDays(now, UPCOMING_DAYS));

  const sections: StudySections = { overdue: [], dueToday: [], upcoming: [] };

  for (const assignment of sortByPriority(assignments)) {
    const { dueAt } = assignment;

    if (dueAt === null || isPastAssignment(assignment, now)) continue;

    if (dueAt < now) sections.overdue.push(assignment);
    else if (dueAt <= todayEnd) sections.dueToday.push(assignment);
    else if (dueAt <= upcomingEnd) sections.upcoming.push(assignment);
  }

  return sections;
}
