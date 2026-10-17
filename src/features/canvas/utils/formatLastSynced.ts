const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "Just now", "12 min ago", "3 hr ago", "Yesterday", or a date like "Nov 13". */
export function formatLastSynced(syncedAt: Date, now: Date = new Date()): string {
  const elapsed = now.getTime() - syncedAt.getTime();

  if (elapsed < MINUTE) {
    return 'Just now';
  }
  if (elapsed < HOUR) {
    return `${Math.floor(elapsed / MINUTE)} min ago`;
  }
  if (elapsed < DAY) {
    return `${Math.floor(elapsed / HOUR)} hr ago`;
  }
  if (elapsed < 2 * DAY) {
    return 'Yesterday';
  }

  return syncedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Time left on a pairing code, e.g. "9:05". */
export function formatTimeLeft(expiresAt: Date, now: Date = new Date()): string {
  const secondsLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000));
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
