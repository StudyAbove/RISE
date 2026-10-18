import type { CalendarEvent } from '../../../models/CalendarEvent';
import { CalendarEventDeleteError } from '../services/calendarEventSyncService';

const PROVIDER_NAMES = {
  google: 'Google Calendar',
  apple: 'Apple Calendar',
} as const;

/** The confirmation's message (AC2). Imported events also leave the calendar they came from. */
export function getDeleteConfirmMessage(event: CalendarEvent): string {
  if (event.source === 'google' || event.source === 'apple') {
    return `This can't be undone. It will also be removed from ${PROVIDER_NAMES[event.source]}.`;
  }

  return "This can't be undone.";
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
