export type ExternalCalendarProvider =
  | 'apple'
  | 'google';

export interface CalendarEventLink {
  id: string;
  calendarEventId: string;
  userId: string;
  provider: ExternalCalendarProvider;
  externalEventId: string;
  externalCalendarId?: string;
  lastSyncedAt?: string;
  externalUpdatedAt?: string;
}