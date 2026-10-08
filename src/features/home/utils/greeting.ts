// Hours (0–23) where each greeting starts. Anything before morning starts
// (late night) still counts as evening.
const MORNING_START_HOUR = 5;
const AFTERNOON_START_HOUR = 12;
const EVENING_START_HOUR = 17;

/** "Good morning", "Good afternoon" or "Good evening", based on the time of day. */
export function getTimeOfDayGreeting(date: Date): string {
  const hour = date.getHours();

  if (hour >= MORNING_START_HOUR && hour < AFTERNOON_START_HOUR) {
    return 'Good morning';
  }
  if (hour >= AFTERNOON_START_HOUR && hour < EVENING_START_HOUR) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

/** Formats a date like "Friday, November 13, 2026". */
export function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** First word of a profile's display name, e.g. "Fahd Ahmed" → "Fahd". */
export function getFirstName(displayName: string | null | undefined): string | null {
  const firstName = displayName?.trim().split(/\s+/)[0];
  return firstName || null;
}
