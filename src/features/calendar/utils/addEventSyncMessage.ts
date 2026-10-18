import type { CalendarEventSyncResult } from '../services/calendarEventSyncService';

const CALENDAR_NAMES = { google: 'Google', apple: 'Apple' } as const;

/**
 * The note shown after adding an event when a connected Google or Apple
 * calendar didn't get it (#123), or null when there's nothing to say. The
 * event is always in RISE by then, so every message starts with that.
 */
export function getAddEventSyncMessage(result: CalendarEventSyncResult): string | null {
  if (result.status === 'synced' || result.status === 'saved-only') {
    return null;
  }

  const failed = result.providerResults.filter((provider) => provider.status === 'failed');

  // The connected calendars couldn't even be checked (e.g. no internet).
  if (failed.length === 0) {
    return "Added to RISE, but couldn't reach your connected calendars.";
  }

  if (failed.length > 1) {
    return "Added to RISE, but couldn't add it to Google or Apple Calendar.";
  }

  const [{ provider, error }] = failed;
  const base = `Added to RISE, but couldn't add it to ${CALENDAR_NAMES[provider]} Calendar.`;

  if (error === 'GOOGLE_CALENDAR_RECONNECT_REQUIRED') {
    return `${base} Reconnect Google in Settings.`;
  }
  if (error === 'APPLE_CALENDAR_NOT_CONNECTED') {
    return `${base} Turn on Full Access for RISE in Settings.`;
  }
  return base;
}
