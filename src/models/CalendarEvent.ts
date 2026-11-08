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
  /**
   * Set when the event shows an assignment (#159). These are read-only: the
   * assignment is the source of truth, and they never go to Apple or Google.
   */
  assignmentId?: string;
  /** The course the event belongs to, e.g. for an assignment's event. */
  course?: CalendarEventCourse;
}

export interface CalendarEventCourse {
  id: string;
  name: string;
  code?: string;
}

/**
 * What the Add Event form provides. The id, owner, and source ('rise') are
 * filled in when the event is saved.
 */
export type NewCalendarEvent = Omit<CalendarEvent, 'id' | 'userId' | 'source' | 'assignmentId' | 'course'>;
