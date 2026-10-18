import type { CalendarEventType, CalendarSource } from '../../../models/CalendarEvent';
import { REMINDER_OPTIONS } from './addEventForm';

/** The event types as students see them, matching the Add Event Type buttons. */
export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  class: 'Class',
  assignment: 'Assignment',
  study: 'Study',
  personal: 'Personal',
  wellness: 'Wellness',
};

/** Where an event came from, for the event details page (#34). */
export const EVENT_SOURCE_LABELS: Record<CalendarSource, string> = {
  rise: 'RISE',
  google: 'Google Calendar',
  apple: 'Apple Calendar',
  canvas: 'Canvas',
};

/** "1 day before" for the Add Event choices; any other value in minutes, hours, or days. */
export function formatReminder(minutes: number): string {
  const choice = REMINDER_OPTIONS.find((option) => option.minutes === minutes);
  if (choice) {
    return choice.label;
  }

  const units: [number, string][] = [
    [24 * 60, 'day'],
    [60, 'hour'],
    [1, 'minute'],
  ];
  const [size, unit] = units.find(([unitMinutes]) => minutes % unitMinutes === 0) ?? [1, 'minute'];
  const count = minutes / size;
  return `${count} ${unit}${count === 1 ? '' : 's'} before`;
}
