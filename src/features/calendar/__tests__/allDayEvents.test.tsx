import { render, screen } from '@testing-library/react-native';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { EventChip } from '../components/EventChip';
import { EventDetailsSheet } from '../components/EventDetailsSheet';
import { formatEventTime } from '../components/TodayEventsCard';
import { getAllDayRange, isAllDayEvent, layoutAllDayBars } from '../utils/allDayEvents';

// Times are in the phone's time zone, like imported events.
const local = (day: number, hour = 0, minute = 0, second = 0) =>
  new Date(2026, 10, day, hour, minute, second).toISOString();

const event = (startAt: string, endAt: string): CalendarEvent => ({
  id: 'event-1',
  userId: 'user-1',
  title: 'Spring Break',
  startAt,
  endAt,
  source: 'google',
});

describe('getAllDayRange', () => {
  it("recognizes Google's one-day all-day event (midnight to the next midnight)", () => {
    expect(getAllDayRange(event(local(16), local(17)))).toEqual({
      firstDay: new Date(2026, 10, 16),
      lastDay: new Date(2026, 10, 16),
    });
  });

  it("recognizes Google's multi-day event, which ends the midnight after its last day", () => {
    expect(getAllDayRange(event(local(16), local(21)))).toEqual({
      firstDay: new Date(2026, 10, 16),
      lastDay: new Date(2026, 10, 20),
    });
  });

  it("recognizes Apple's all-day events, which end at 11:59 PM on the last day", () => {
    expect(getAllDayRange(event(local(16), local(16, 23, 59, 59)))).toEqual({
      firstDay: new Date(2026, 10, 16),
      lastDay: new Date(2026, 10, 16),
    });
    expect(getAllDayRange(event(local(16), local(20, 23, 59)))?.lastDay).toEqual(new Date(2026, 10, 20));
  });

  it.each([
    ['a normal timed event', local(16, 9), local(16, 10)],
    ['an event starting at midnight but ending in the morning', local(16), local(16, 8)],
    ['an event starting late and ending at midnight', local(16, 22), local(17)],
    ['a zero-length event at midnight', local(16), local(16)],
  ])('treats %s as having times', (_, startAt, endAt) => {
    expect(isAllDayEvent(event(startAt, endAt))).toBe(false);
  });
});

describe('all-day wording', () => {
  it('says "All day" instead of times', () => {
    expect(formatEventTime(event(local(16), local(17)))).toBe('All day');
    expect(formatEventTime(event(local(16, 9), local(16, 10)))).toBe('9:00 AM – 10:00 AM');
  });

  it('tells VoiceOver the event is all day', async () => {
    await render(<EventChip event={event(local(16), local(17))} size="regular" />);

    expect(screen.getByLabelText('Spring Break, Google Calendar, all day')).toBeOnTheScreen();
  });

  it('shows the first and last day of a multi-day event on its details page', async () => {
    await render(
      <EventDetailsSheet
        visible
        event={event(local(16), local(21))}
        onClose={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        hasUnresolvedConflict={false}
        readOnly={false}
        providerSources={[]}
        onReviewConflict={jest.fn()}
      />,
    );

    expect(screen.getByText(/Monday, November 16 – Friday, November 20, 2026/)).toBeOnTheScreen();
    expect(screen.getByText(/All day/)).toBeOnTheScreen();
  });
});

describe('layoutAllDayBars', () => {
  // A week from Sunday, November 15 to Saturday, November 21, 2026.
  const week = Array.from({ length: 7 }, (_, i) => new Date(2026, 10, 15 + i));
  const allDay = (id: string, firstDay: number, lastDay: number): CalendarEvent => ({
    ...event(local(firstDay), local(lastDay + 1)),
    id,
    title: id,
  });

  it('draws a multi-day event as one bar across its days', () => {
    expect(layoutAllDayBars([allDay('Spring Break', 16, 20)], week)).toEqual([
      expect.objectContaining({ startIndex: 1, span: 5, lane: 0 }),
    ]);
  });

  it('cuts a bar off at the edges of the visible days', () => {
    const twoDays = [new Date(2026, 10, 18), new Date(2026, 10, 19)];

    expect(layoutAllDayBars([allDay('Spring Break', 16, 20)], twoDays)).toEqual([
      expect.objectContaining({ startIndex: 0, span: 2 }),
    ]);
  });

  it('leaves out all-day events outside the visible days, and timed events', () => {
    const timed = { ...event(local(16, 9), local(16, 10)), id: 'Dentist' };

    expect(layoutAllDayBars([allDay('Last Week', 8, 10), allDay('Next Week', 23, 24), timed], week)).toEqual([]);
  });

  it('stacks bars that share a day, and reuses a lane once it is free', () => {
    const bars = layoutAllDayBars(
      [allDay('Holiday', 19, 19), allDay('Spring Break', 16, 20), allDay('Trip', 21, 21), allDay('Retreat', 15, 16)],
      week,
    );
    const laneOf = (id: string) => bars.find((bar) => bar.event.id === id)?.lane;

    // Retreat (Sun–Mon) is earliest, so lane 0; Spring Break (Mon–Fri) shares Monday, so lane 1;
    // Holiday (Thu) is under Spring Break but Retreat's lane is free by then; Trip (Sat) fits lane 0 too.
    expect(laneOf('Retreat')).toBe(0);
    expect(laneOf('Spring Break')).toBe(1);
    expect(laneOf('Holiday')).toBe(0);
    expect(laneOf('Trip')).toBe(0);
  });
});
