// An incomplete assignment needs attention when due within 24 hours.
// Overdue assignments also remain urgent until completed.
const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isAssignmentUrgent(
  dueAt: Date | null,
  completed: boolean,
  now: Date,
): boolean {
  if (completed || dueAt === null) {
    return false;
  }

  const dueTime = dueAt.getTime();
  const currentTime = now.getTime();

  if (!Number.isFinite(dueTime) || !Number.isFinite(currentTime)) {
    return false;
  }

  return dueTime <= currentTime + DUE_SOON_WINDOW_MS;
}