/**
 * Assignment progress from its microtasks (#46).
 *
 * Each task counts by its estimated time, so finishing a 60-minute task moves
 * the bar further than finishing a 10-minute one.
 */

import { formatEstimate } from './assignmentEstimate';

/** The parts of a microtask that progress is calculated from. */
export type MicrotaskProgressInput = {
  estimatedMinutes: number;
  completed: boolean;
};

export type MicrotaskProgress = {
  /** 0–100, rounded. Only 100 when every task is done. */
  percent: number;
  completedCount: number;
  totalCount: number;
  remainingCount: number;
  /** Estimated minutes of the tasks that aren't done yet. */
  remainingMinutes: number;
};

// A task with a missing or invalid estimate still counts, as this many minutes.
const FALLBACK_TASK_MINUTES = 1;

function taskMinutes(task: MicrotaskProgressInput) {
  return Number.isFinite(task.estimatedMinutes) && task.estimatedMinutes > 0
    ? task.estimatedMinutes
    : FALLBACK_TASK_MINUTES;
}

/**
 * Rounds to a whole percent, but never shows 0% once some work is done or
 * 100% while some is left.
 */
function roundPercent(done: number, total: number) {
  if (total <= 0 || done <= 0) return 0;
  if (done >= total) return 100;

  return Math.min(99, Math.max(1, Math.round((done / total) * 100)));
}

export function getMicrotaskProgress(
  tasks: MicrotaskProgressInput[],
): MicrotaskProgress {
  let totalMinutes = 0;
  let completedMinutes = 0;
  let completedCount = 0;

  for (const task of tasks) {
    const minutes = taskMinutes(task);

    totalMinutes += minutes;

    if (task.completed) {
      completedMinutes += minutes;
      completedCount += 1;
    }
  }

  return {
    percent: roundPercent(completedMinutes, totalMinutes),
    completedCount,
    totalCount: tasks.length,
    remainingCount: tasks.length - completedCount,
    remainingMinutes: totalMinutes - completedMinutes,
  };
}

/**
 * The percent shown on an assignment's card. A completed assignment is always
 * 100%, even if some of its microtasks were never checked off. Without
 * microtasks, an unfinished assignment is 0%.
 */
export function getAssignmentProgressPercent(assignment: {
  completed: boolean;
  microtasks?: MicrotaskProgressInput[];
}) {
  if (assignment.completed) return 100;

  return getMicrotaskProgress(assignment.microtasks ?? []).percent;
}

/**
 * What's left of an assignment, shown under its progress bar (#46), e.g.
 * "3 tasks left · about 45m" or "All tasks done".
 */
export function getRemainingWorkLabel(progress: MicrotaskProgress) {
  if (progress.remainingCount === 0) return 'All tasks done';

  const tasks = progress.remainingCount === 1 ? 'task' : 'tasks';

  return `${progress.remainingCount} ${tasks} left · about ${formatEstimate(progress.remainingMinutes)}`;
}
