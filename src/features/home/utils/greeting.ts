/** Part of the day, used for both the greeting and the Home sky picture. */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

// Hours (0–23) where each part of the day starts. Night runs past midnight
// until morning starts.
const MORNING_START_HOUR = 5;
const AFTERNOON_START_HOUR = 12;
const EVENING_START_HOUR = 17;
const NIGHT_START_HOUR = 20;

const GREETINGS: Record<TimeOfDay, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  // The night sky has its own picture, but the greeting stays "Good evening".
  night: 'Good evening',
};

export function getTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();

  if (hour >= MORNING_START_HOUR && hour < AFTERNOON_START_HOUR) {
    return 'morning';
  }
  if (hour >= AFTERNOON_START_HOUR && hour < EVENING_START_HOUR) {
    return 'afternoon';
  }
  if (hour >= EVENING_START_HOUR && hour < NIGHT_START_HOUR) {
    return 'evening';
  }
  return 'night';
}

/** "Good morning", "Good afternoon" or "Good evening", based on the time of day. */
export function getTimeOfDayGreeting(date: Date): string {
  return GREETINGS[getTimeOfDay(date)];
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
