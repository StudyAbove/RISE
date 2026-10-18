import { fireEvent, render, screen } from '@testing-library/react-native';
import { format, parseISO } from 'date-fns';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { EventDetailsSheet } from '../components/EventDetailsSheet';
import { formatEventTime } from '../components/TodayEventsCard';
import { EVENT_SOURCE_LABELS, formatReminder } from '../utils/eventLabels';

const basicEvent: CalendarEvent = {
  id: 'event-1',
  userId: 'user-1',
  title: 'Biology Lab Report',
  startAt: '2026-11-18T17:00:00.000Z',
  endAt: '2026-11-18T18:30:00.000Z',
  source: 'rise',
};

const fullEvent: CalendarEvent = {
  ...basicEvent,
  eventType: 'assignment',
  location: 'Hall of Science 210',
  reminderMinutes: 24 * 60,
  description: 'Bring the lab notebook.',
};

async function renderSheet(event: CalendarEvent | null) {
  const onClose = jest.fn();
  const onEdit = jest.fn();
  const result = await render(<EventDetailsSheet visible event={event} onClose={onClose} onEdit={onEdit} />);
  return { ...result, onClose, onEdit };
}

describe('EventDetailsSheet', () => {
  it('shows the title, date, time, and where the event came from (AC2)', async () => {
    await renderSheet(basicEvent);

    expect(screen.getByRole('header', { name: 'Biology Lab Report' })).toBeTruthy();
    // Dates show in the phone's time zone.
    expect(screen.getByText(new RegExp(format(parseISO(basicEvent.startAt), 'EEEE, MMMM d, yyyy')))).toBeTruthy();
    expect(screen.getByText(new RegExp(formatEventTime(basicEvent)))).toBeTruthy();
    expect(screen.getByText('From RISE')).toBeTruthy();
  });

  it('hides optional details the event does not have', async () => {
    await renderSheet(basicEvent);

    expect(screen.queryByText('Assignment')).toBeNull();
    expect(screen.queryByText(/Reminder:/)).toBeNull();
    expect(screen.queryByText('Notes')).toBeNull();
  });

  it('shows saved optional details (AC2)', async () => {
    await renderSheet(fullEvent);

    expect(screen.getByText('Assignment')).toBeTruthy();
    expect(screen.getByText('Hall of Science 210')).toBeTruthy();
    expect(screen.getByText('Reminder: 1 day before')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Notes' })).toBeTruthy();
    expect(screen.getByText('Bring the lab notebook.')).toBeTruthy();
  });

  it('hides Notes when the description is only spaces', async () => {
    await renderSheet({ ...basicEvent, description: '   ' });

    expect(screen.queryByText('Notes')).toBeNull();
  });

  it.each(['google', 'apple', 'canvas'] as const)('names %s events by their calendar', async (source) => {
    await renderSheet({ ...basicEvent, source });

    expect(screen.getByText(`From ${EVENT_SOURCE_LABELS[source]}`)).toBeTruthy();
  });

  it('darkens the white Apple logo so it shows on the card', async () => {
    await renderSheet({ ...basicEvent, source: 'apple' });

    expect(screen.getByTestId('event-source-logo')).toHaveStyle({ tintColor: '#1E1E1E' });
  });

  it('colors the top circle by event type', async () => {
    await renderSheet(fullEvent);

    expect(screen.getByTestId('event-type-circle')).toHaveStyle({ backgroundColor: '#FFF1B8' });
  });

  it('closes with the ✕ (AC3)', async () => {
    const { onClose } = await renderSheet(basicEvent);

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('passes the event to Edit', async () => {
    const { onEdit } = await renderSheet(fullEvent);

    await fireEvent.press(screen.getByRole('button', { name: 'Edit' }));

    expect(onEdit).toHaveBeenCalledWith(fullEvent);
  });

  it('shows Delete but keeps it disabled until #80', async () => {
    await renderSheet(basicEvent);

    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  it('shows only the close button when there is no event', async () => {
    await renderSheet(null);

    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  });
});

describe('formatReminder', () => {
  it('uses the Add Event label for a standard choice', () => {
    expect(formatReminder(24 * 60)).toBe('1 day before');
  });

  it('writes other amounts in the largest whole unit', () => {
    expect(formatReminder(2 * 24 * 60)).toBe('2 days before');
    expect(formatReminder(120)).toBe('2 hours before');
    expect(formatReminder(45)).toBe('45 minutes before');
    expect(formatReminder(1)).toBe('1 minute before');
  });
});
