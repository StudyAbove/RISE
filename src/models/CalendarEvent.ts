export type CalendarSource =
  | 'rise'
  | 'apple'
  | 'google'
  | 'canvas';

/** The type buttons on the Add Event form. */
export type CalendarEventType =
  | 'class'
  | 'assignment'
  | 'study'
  | 'personal'
  | 'wellness';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  startAt: string;
  endAt: string;
  source: CalendarSource;
  location?: string;
  description?: string;
  eventType?: CalendarEventType;
  /** Minutes before startAt to remind the student, e.g. 1440 for 1 day. */
  reminderMinutes?: number;
}

/**
 * What the Add Event form provides. The id, owner, and source ('rise') are
 * filled in when the event is saved.
 */
export type NewCalendarEvent = Omit<CalendarEvent, 'id' | 'userId' | 'source'>;
