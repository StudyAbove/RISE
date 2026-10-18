import { addDays, format, set, startOfDay } from 'date-fns';

import type { CalendarEventType, NewCalendarEvent } from '../../../models/CalendarEvent';

/*
 * The form keeps times as minutes after midnight (9:30 AM = 570). Whole
 * numbers are easy to compare and list; they only become real dates when the
 * event is saved. 1440 means midnight at the end of the chosen day.
 */

export const TIME_STEP_MINUTES = 30;
export const DEFAULT_DURATION_MINUTES = 60;
const END_OF_DAY = 24 * 60;

export interface AddEventFormValues {
  title: string;
  date: Date | null;
  startMinute: number | null;
  endMinute: number | null;
  eventType: CalendarEventType | null;
  location: string;
  reminderMinutes: number | null;
}

export const EMPTY_ADD_EVENT_FORM: AddEventFormValues = {
  title: '',
  date: null,
  startMinute: null,
  endMinute: null,
  eventType: null,
  location: '',
  reminderMinutes: null,
};

/** The required fields (AC4), with the message shown when each is missing. */
export type AddEventFormErrors = Partial<Record<'title' | 'date' | 'startTime', string>>;

export function validateAddEventForm(values: AddEventFormValues): AddEventFormErrors {
  const errors: AddEventFormErrors = {};

  // A title of only spaces counts as blank.
  if (values.title.trim() === '') {
    errors.title = 'Add a title';
  }
  if (values.date === null) {
    errors.date = 'Pick a date';
  }
  if (values.startMinute === null) {
    errors.startTime = 'Pick a time';
  }
  return errors;
}

/** "9:30 AM", or "12:00 AM (next day)" for the midnight that ends the day. */
export function formatTimeOption(minute: number): string {
  if (minute === END_OF_DAY) {
    return '12:00 AM (next day)';
  }
  // The date is a placeholder; only the time is shown.
  return format(new Date(2000, 0, 1, Math.floor(minute / 60), minute % 60), 'h:mm a');
}

/** Every start time the form offers: 12:00 AM to 11:30 PM, every 30 minutes. */
export const START_TIME_OPTIONS: number[] = Array.from(
  { length: END_OF_DAY / TIME_STEP_MINUTES },
  (_, index) => index * TIME_STEP_MINUTES
);

/**
 * End times to offer: every 30 minutes after the start, up to midnight at the
 * end of the day. Before a start is chosen, every end time is offered
 * (12:30 AM to midnight), so End can be picked first.
 */
export function getEndTimeOptions(startMinute: number | null): number[] {
  const options: number[] = [];
  for (let minute = (startMinute ?? 0) + TIME_STEP_MINUTES; minute <= END_OF_DAY; minute += TIME_STEP_MINUTES) {
    options.push(minute);
  }
  return options;
}

/**
 * The end time to use after a start is picked. An end that's still after the
 * new start is kept; otherwise (or if there's no end yet) the event ends 1 hour
 * after the start, never past midnight.
 */
export function getEndMinuteAfterStartChange(newStartMinute: number, currentEndMinute: number | null): number {
  if (currentEndMinute !== null && currentEndMinute > newStartMinute) {
    return currentEndMinute;
  }
  return Math.min(newStartMinute + DEFAULT_DURATION_MINUTES, END_OF_DAY);
}

/** The reminder choices from Figma, in minutes before the event. */
export const REMINDER_OPTIONS = [
  { label: '1 week before', minutes: 7 * 24 * 60 },
  { label: '1 day before', minutes: 24 * 60 },
  { label: '3 hours before', minutes: 3 * 60 },
] as const;

// Sets the clock time on a day. Uses the clock rather than adding minutes to
// midnight, so 3:00 PM stays 3:00 PM on daylight-saving days.
function atMinuteOfDay(day: Date, minute: number): Date {
  if (minute === END_OF_DAY) {
    return addDays(startOfDay(day), 1);
  }
  return set(day, { hours: Math.floor(minute / 60), minutes: minute % 60, seconds: 0, milliseconds: 0 });
}

/**
 * Turns a valid form into the event to save. Call validateAddEventForm first;
 * this throws if a required field is missing. If no end was chosen, the event
 * lasts 1 hour (capped at midnight).
 */
export function buildNewCalendarEvent(values: AddEventFormValues): NewCalendarEvent {
  const { date, startMinute } = values;
  if (date === null || startMinute === null || values.title.trim() === '') {
    throw new Error('The form is missing a required field.');
  }

  const endMinute = getEndMinuteAfterStartChange(startMinute, values.endMinute);
  const location = values.location.trim();

  return {
    title: values.title.trim(),
    startAt: atMinuteOfDay(date, startMinute).toISOString(),
    endAt: atMinuteOfDay(date, endMinute).toISOString(),
    location: location === '' ? undefined : location,
    eventType: values.eventType ?? undefined,
    reminderMinutes: values.reminderMinutes ?? undefined,
  };
}
