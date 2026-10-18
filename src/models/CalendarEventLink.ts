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

  /**
   * Whether the external provider allows RISE to modify this event.
   *
   * Read-only calendars such as subscribed holiday calendars can still
   * be imported, but shared event fields must not be pushed back to them.
   */
  isWritable: boolean;

  /**
   * Provider-level all-day metadata used for conservative
   * cross-provider duplicate detection.
   *
   * Google and Apple can represent an all-day event with different
   * concrete timestamps, so matching uses these semantic dates instead.
   */
  isAllDay: boolean;
  allDayStartDate?: string;
  allDayEndDate?: string;

  lastSyncedAt?: string;
  externalUpdatedAt?: string;
}