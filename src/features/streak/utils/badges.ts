import type { Assignment } from '../../../repositories/assignmentsRepository';
import { getOnTimeSubmissions } from './streak';

/** On-time assignments needed for each badge (#9). */
export const BADGE_MILESTONES = [5, 10, 25] as const;

export type Badge = {
  milestone: (typeof BADGE_MILESTONES)[number];
  /** When the assignment that earned it was turned in; null until earned. */
  earnedAt: Date | null;
  /** On-time assignments so far, up to the milestone, e.g. 18 of 25. */
  progress: number;
};

/**
 * Badges for 5, 10 and 25 assignments turned in on time, ever. Unlike the
 * streak, a missed assignment doesn't take one away.
 */
export function getBadges(assignments: Assignment[], now: Date): Badge[] {
  const onTime = getOnTimeSubmissions(assignments, now);

  return BADGE_MILESTONES.map((milestone) => ({
    milestone,
    earnedAt: onTime[milestone - 1]?.completedAt ?? null,
    progress: Math.min(onTime.length, milestone),
  }));
}
