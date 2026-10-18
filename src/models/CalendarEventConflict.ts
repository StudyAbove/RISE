import type {
  ExternalCalendarProvider,
} from './CalendarEventLink';

export type CalendarEventConflictStatus =
  | 'unresolved'
  | 'resolved';

/**
 * Records which version ultimately won a conflict.
 *
 * Using the specific provider instead of a generic "calendar"
 * matters when the same RISE event conflicts with both Apple
 * and Google at the same time.
 */
export type CalendarEventConflictResolution =
  | 'rise'
  | 'apple'
  | 'google';

export interface CalendarEventConflictVersion {
  title: string;
  startAt: string;
  endAt: string;
  location?: string;
  description?: string;
  updatedAt?: string;
}

export interface CalendarEventConflict {
  id: string;
  calendarEventId: string;
  calendarEventLinkId: string;
  userId: string;
  provider: ExternalCalendarProvider;

  riseVersion: CalendarEventConflictVersion;
  providerVersion: CalendarEventConflictVersion;

  status: CalendarEventConflictStatus;
  resolution?: CalendarEventConflictResolution;

  createdAt: string;
  resolvedAt?: string;
}

export interface SaveCalendarEventConflictInput {
  calendarEventId: string;
  calendarEventLinkId: string;
  userId: string;
  provider: ExternalCalendarProvider;

  riseVersion: CalendarEventConflictVersion;
  providerVersion: CalendarEventConflictVersion;
}