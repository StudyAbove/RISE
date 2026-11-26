import { addDays, isSameDay, startOfDay, startOfWeek } from 'date-fns';

import type { Assignment } from '../../../repositories/assignmentsRepository';

/**
 * Streak rules (#13), used by the Streak page (#7):
 * - Each day you turn in at least one assignment on time adds a day.
 * - Missing an assignment (its due time passes and it isn't done, or it was
 *   done late) breaks the streak.
 * - A day with nothing turned in and nothing missed doesn't add a day or
 *   break the streak.
 */

export type StreakDay = {
  date: Date;
  submittedOnTime: boolean;
};

/** An assignment turned in on time during the current streak (#10). */
export type StreakAssignment = {
  assignment: Assignment;
  completedAt: Date;
};

export type StreakSummary = {
  current: number;
  longest: number;
  /** Weeks (Monday to Sunday) with at least one on-time submission. */
  totalWeeks: number;
  /** Monday to Sunday of the current week. */
  week: StreakDay[];
  /** What kept the current streak going, newest first. Empty with no streak. */
  currentAssignments: StreakAssignment[];
};

type StreakEvent = { type: 'submitted' | 'missed'; time: Date; assignment: Assignment };

function isOnTime(completedAt: Date, dueAt: Date) {
  return completedAt.getTime() <= dueAt.getTime();
}

/** Every on-time submission and every missed due date, in time order. */
function getStreakEvents(assignments: Assignment[], now: Date): StreakEvent[] {
  const events: StreakEvent[] = [];

  for (const assignment of assignments) {
    const { completed, completedAt, dueAt, source } = assignment;

    // Without a due date there's no "on time", so it doesn't affect the streak.
    if (!dueAt) continue;

    if (completed && completedAt) {
      events.push(
        isOnTime(completedAt, dueAt)
          ? { type: 'submitted', time: completedAt, assignment }
          : { type: 'missed', time: dueAt, assignment },
      );
    } else if (!completed && source !== 'rise' && dueAt.getTime() < now.getTime()) {
      // RISE has no way to mark its own assignments done yet, so they can't
      // count as missed; only Canvas reports what was turned in.
      events.push({ type: 'missed', time: dueAt, assignment });
    }
    // Completed with no recorded date: we can't tell if it was on time.
  }

  return events.sort((a, b) => a.time.getTime() - b.time.getTime());
}

export function calculateStreak(assignments: Assignment[], now: Date): StreakSummary {
  const events = getStreakEvents(assignments, now);

  let current = 0;
  let longest = 0;
  // The last day counted toward the current streak, so a day only counts once.
  let lastCountedDay: Date | null = null;
  // Every on-time submission since the streak last broke, oldest first.
  let currentAssignments: StreakAssignment[] = [];

  for (const event of events) {
    if (event.type === 'missed') {
      current = 0;
      lastCountedDay = null;
      currentAssignments = [];
      continue;
    }

    currentAssignments.push({ assignment: event.assignment, completedAt: event.time });

    if (!lastCountedDay || !isSameDay(lastCountedDay, event.time)) {
      current += 1;
      lastCountedDay = event.time;
      longest = Math.max(longest, current);
    }
  }

  const monday = startOfWeek(now, { weekStartsOn: 1 });
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = startOfDay(addDays(monday, index));
    return {
      date,
      submittedOnTime: events.some(
        (event) => event.type === 'submitted' && isSameDay(event.time, date),
      ),
    };
  });

  const weeksWithSubmissions = new Set(
    events
      .filter((event) => event.type === 'submitted')
      .map((event) => startOfWeek(event.time, { weekStartsOn: 1 }).getTime()),
  );

  return {
    current,
    longest,
    totalWeeks: weeksWithSubmissions.size,
    week,
    currentAssignments: currentAssignments.reverse(),
  };
}
