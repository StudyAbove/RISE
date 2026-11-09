/**
 * Recorded study time for display (#49): "12h 30m", "1h", "45m", or "0m".
 * Partial minutes are dropped.
 */
export function formatStudyTime(seconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}
