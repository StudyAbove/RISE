import type { ExternalCalendarProvider } from '../../../models/CalendarEventLink';
import { CalendarEventDeleteError } from '../services/calendarEventSyncService';

const PROVIDER_NAMES = {
  google: 'Google Calendar',
  apple: 'Apple Calendar',
} as const;

/**
 * The confirmation's message (AC2), naming every calendar the event will also
 * be deleted from. linkedProviders is null when the links couldn't be checked,
 * so the message stays general instead of leaving any calendar out.
 */
export function getDeleteConfirmMessage(linkedProviders: ExternalCalendarProvider[] | null): string {
  const base = "This can't be undone.";

  if (linkedProviders === null) {
    return `${base} It will also be removed from any calendar it's synced with.`;
  }

  if (linkedProviders.length === 0) {
    return base;
  }

  return `${base} It will also be removed from ${linkedProviders.map((provider) => PROVIDER_NAMES[provider]).join(' and ')}.`;
}

/** Why a delete failed, in plain words, and what to do about it (AC8). */
export function getDeleteErrorMessage(error: unknown): string {
  const kept = 'The event is still on your calendar.';
  const provider = error instanceof CalendarEventDeleteError ? error.provider : undefined;
  const code = error instanceof Error ? error.message : '';

  if (provider === 'google' && code === 'GOOGLE_CALENDAR_RECONNECT_REQUIRED') {
    return `${kept} Reconnect Google Calendar in Settings, then try again.`;
  }

  if (provider === 'apple' && code === 'APPLE_CALENDAR_NOT_CONNECTED') {
    return `${kept} RISE needs Full Calendar Access to remove it from Apple Calendar. Turn it on in Settings, then try again.`;
  }

  if (provider) {
    return `${kept} It couldn't be removed from ${PROVIDER_NAMES[provider]}. Check your connection and try again.`;
  }

  return `${kept} Check your connection and try again.`;
}
