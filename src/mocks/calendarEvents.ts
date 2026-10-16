import { addDays, addMinutes, startOfDay } from 'date-fns';

import type { CalendarEvent, CalendarSource, NewCalendarEvent } from '../models/CalendarEvent';

interface SampleEvent {
  title: string;
  source: CalendarSource;
  /** Days after today (negative for the past). */
  dayOffset: number;
  /** Clock time it starts, e.g. '09:30'. */
  startTime: string;
  durationMinutes: number;
}

// Placed around today so they're always on screen when testing. Chosen to
// cover the tricky cases: overlapping events, one just before midnight, one
// that crosses midnight, and enough on one day to need "+N more" in Month.
const SAMPLE_EVENTS: SampleEvent[] = [
  { title: 'Biology Lecture', source: 'rise', dayOffset: 0, startTime: '09:00', durationMinutes: 90 },
  { title: 'Coffee with TA', source: 'google', dayOffset: 0, startTime: '10:00', durationMinutes: 60 },
  { title: 'Study Group', source: 'google', dayOffset: 0, startTime: '13:00', durationMinutes: 60 },
  { title: 'Office Hours', source: 'apple', dayOffset: 0, startTime: '16:00', durationMinutes: 60 },
  { title: 'Osmosis Lab Report', source: 'canvas', dayOffset: 0, startTime: '23:00', durationMinutes: 59 },
  { title: 'Morning Run', source: 'apple', dayOffset: 1, startTime: '07:00', durationMinutes: 45 },
  { title: 'Late-Night Review', source: 'rise', dayOffset: 1, startTime: '23:30', durationMinutes: 90 },
  { title: 'Problem Set #5', source: 'canvas', dayOffset: -3, startTime: '10:00', durationMinutes: 60 },
  { title: 'Algebra Quiz', source: 'rise', dayOffset: 5, startTime: '12:00', durationMinutes: 90 },
];

// Events added with the Add Event form while the login skip is on. They only
// live in memory, so they disappear when the app reloads.
let addedEvents: CalendarEvent[] = [];

/** Saves an event in memory, standing in for Supabase while the login skip is on. */
export function addMockCalendarEvent(input: NewCalendarEvent): CalendarEvent {
  const event: CalendarEvent = {
    ...input,
    id: `mock-added-event-${addedEvents.length + 1}`,
    userId: 'dev-user',
    source: 'rise',
  };
  addedEvents = [...addedEvents, event];
  return event;
}

/** Clears the in-memory events. For tests only. */
export function clearAddedMockCalendarEvents() {
  addedEvents = [];
}

/** Sample events, plus any added in memory, used instead of Supabase while the dev login skip is on. */
export function getMockCalendarEvents(rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  const today = startOfDay(new Date());

  const samples: CalendarEvent[] = SAMPLE_EVENTS.map((sample, index) => {
    const [hours, minutes] = sample.startTime.split(':').map(Number);
    const start = addMinutes(addDays(today, sample.dayOffset), hours * 60 + minutes);
    const end = addMinutes(start, sample.durationMinutes);

    return {
      id: `mock-event-${index + 1}`,
      userId: 'dev-user',
      title: sample.title,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      source: sample.source,
    };
  });

  return [...samples, ...addedEvents].filter(
    // Same overlap rule as the Supabase query. UTC ISO strings sort in time order.
    (event) => event.startAt < rangeEnd.toISOString() && event.endAt > rangeStart.toISOString()
  );
}
