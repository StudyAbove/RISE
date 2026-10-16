import { format, parseISO } from 'date-fns';

import {
  buildNewCalendarEvent,
  EMPTY_ADD_EVENT_FORM,
  formatTimeOption,
  getEndMinuteAfterStartChange,
  getEndTimeOptions,
  REMINDER_OPTIONS,
  START_TIME_OPTIONS,
  validateAddEventForm,
  type AddEventFormValues,
} from '../utils/addEventForm';

const friday = new Date(2026, 10, 13);
const filledForm: AddEventFormValues = {
  ...EMPTY_ADD_EVENT_FORM,
  title: 'Chem Lab',
  date: friday,
  startMinute: 9 * 60 + 30,
  endMinute: 11 * 60,
};

// Shows a saved time in the phone's time zone, e.g. "2026-11-13 09:30".
const localTime = (iso: string) => format(parseISO(iso), 'yyyy-MM-dd HH:mm');

describe('validateAddEventForm (AC4)', () => {
  it('asks for the title, date, and time when all are blank', () => {
    expect(validateAddEventForm(EMPTY_ADD_EVENT_FORM)).toEqual({
      title: 'Add a title',
      date: 'Pick a date',
      startTime: 'Pick a time',
    });
  });

  it('treats a title of only spaces as blank', () => {
    expect(validateAddEventForm({ ...filledForm, title: '   ' })).toEqual({ title: 'Add a title' });
  });

  it('passes when the title, date, and time are filled in', () => {
    expect(validateAddEventForm(filledForm)).toEqual({});
  });

  it('does not require the optional fields', () => {
    expect(
      validateAddEventForm({ ...filledForm, endMinute: null, eventType: null, location: '', reminderMinutes: null })
    ).toEqual({});
  });
});

describe('time options', () => {
  it('offers start times from 12:00 AM to 11:30 PM every 30 minutes', () => {
    expect(START_TIME_OPTIONS).toHaveLength(48);
    expect(formatTimeOption(START_TIME_OPTIONS[0])).toBe('12:00 AM');
    expect(formatTimeOption(START_TIME_OPTIONS[19])).toBe('9:30 AM');
    expect(formatTimeOption(START_TIME_OPTIONS[24])).toBe('12:00 PM');
    expect(formatTimeOption(START_TIME_OPTIONS[47])).toBe('11:30 PM');
  });

  it('only offers end times after the start, ending with midnight', () => {
    const options = getEndTimeOptions(21 * 60).map(formatTimeOption);

    expect(options).toEqual(['9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM', '12:00 AM (next day)']);
  });

  it('still offers midnight when the start is 11:30 PM', () => {
    expect(getEndTimeOptions(23 * 60 + 30).map(formatTimeOption)).toEqual(['12:00 AM (next day)']);
  });

  it('offers every end time before a start is chosen', () => {
    const options = getEndTimeOptions(null);

    expect(options).toHaveLength(48);
    expect(formatTimeOption(options[0])).toBe('12:30 AM');
    expect(formatTimeOption(options[47])).toBe('12:00 AM (next day)');
  });
});

describe('getEndMinuteAfterStartChange', () => {
  it('ends 1 hour after the start when no end is chosen yet', () => {
    expect(getEndMinuteAfterStartChange(9 * 60, null)).toBe(10 * 60);
  });

  it('keeps an end that is still after the new start', () => {
    expect(getEndMinuteAfterStartChange(13 * 60, 15 * 60 + 30)).toBe(15 * 60 + 30);
  });

  it('resets to 1 hour after the start when the end is before or at the start', () => {
    expect(getEndMinuteAfterStartChange(13 * 60, 11 * 60)).toBe(14 * 60);
    expect(getEndMinuteAfterStartChange(13 * 60, 13 * 60)).toBe(14 * 60);
  });

  it('never runs past midnight', () => {
    expect(getEndMinuteAfterStartChange(23 * 60 + 30, null)).toBe(24 * 60);
  });
});

describe('buildNewCalendarEvent', () => {
  it('combines the date with the start and end times', () => {
    const event = buildNewCalendarEvent(filledForm);

    expect(localTime(event.startAt)).toBe('2026-11-13 09:30');
    expect(localTime(event.endAt)).toBe('2026-11-13 11:00');
  });

  it('lasts 1 hour when no end time was chosen', () => {
    const event = buildNewCalendarEvent({ ...filledForm, endMinute: null });

    expect(localTime(event.endAt)).toBe('2026-11-13 10:30');
  });

  it('ends at midnight of the next day when that end is chosen', () => {
    const event = buildNewCalendarEvent({ ...filledForm, startMinute: 23 * 60, endMinute: 24 * 60 });

    expect(localTime(event.startAt)).toBe('2026-11-13 23:00');
    expect(localTime(event.endAt)).toBe('2026-11-14 00:00');
  });

  it('keeps the clock time on a daylight-saving day', () => {
    // US clocks fall back on November 1, 2026.
    const event = buildNewCalendarEvent({ ...filledForm, date: new Date(2026, 10, 1), startMinute: 15 * 60, endMinute: 16 * 60 });

    expect(localTime(event.startAt)).toBe('2026-11-01 15:00');
    expect(localTime(event.endAt)).toBe('2026-11-01 16:00');
  });

  it('trims the title and location, and leaves blank optional fields out', () => {
    const event = buildNewCalendarEvent({ ...filledForm, title: '  Chem Lab  ', location: '   ' });

    expect(event.title).toBe('Chem Lab');
    expect(event.location).toBeUndefined();
    expect(event.eventType).toBeUndefined();
    expect(event.reminderMinutes).toBeUndefined();
  });

  it('includes the type, location, and reminder when chosen', () => {
    const event = buildNewCalendarEvent({
      ...filledForm,
      location: ' Room 204 ',
      eventType: 'study',
      reminderMinutes: REMINDER_OPTIONS[1].minutes,
    });

    expect(event).toMatchObject({ location: 'Room 204', eventType: 'study', reminderMinutes: 1440 });
  });

  it('refuses a form that is missing a required field', () => {
    expect(() => buildNewCalendarEvent({ ...filledForm, date: null })).toThrow();
  });
});

describe('REMINDER_OPTIONS', () => {
  it('matches the Figma choices in minutes', () => {
    expect(REMINDER_OPTIONS.map(({ label, minutes }) => [label, minutes])).toEqual([
      ['1 week before', 10080],
      ['1 day before', 1440],
      ['3 hours before', 180],
    ]);
  });
});

describe('buildNewCalendarEvent with an end picked before the start', () => {
  it('uses the end when it comes after the start', () => {
    const event = buildNewCalendarEvent({ ...filledForm, startMinute: 9 * 60, endMinute: 12 * 60 });

    expect(localTime(event.endAt)).toBe('2026-11-13 12:00');
  });

  it('ends 1 hour after the start when the end came first and is earlier', () => {
    const event = buildNewCalendarEvent({ ...filledForm, startMinute: 15 * 60, endMinute: 10 * 60 });

    expect(localTime(event.endAt)).toBe('2026-11-13 16:00');
  });
});
