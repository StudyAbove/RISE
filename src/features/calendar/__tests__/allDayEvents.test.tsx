import { render, screen } from '@testing-library/react-native';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { EventChip } from '../components/EventChip';
import { EventDetailsSheet } from '../components/EventDetailsSheet';
import { formatEventTime } from '../components/TodayEventsCard';
import { getAllDayRange, isAllDayEvent } from '../utils/allDayEvents';

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
