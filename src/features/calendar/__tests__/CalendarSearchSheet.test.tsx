import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { CalendarSearchSheet, formatSearchResultTime } from '../components/search/CalendarSearchSheet';

const mockSearchCalendarEvents = jest.fn();
jest.mock('../../../repositories/calendarEventsRepository', () => ({
  searchCalendarEvents: (...args: unknown[]) => mockSearchCalendarEvents(...args),
}));

const lecture: CalendarEvent = {
  id: 'lecture',
  userId: 'user-1',
  title: 'CECS 449 Lecture',
  startAt: new Date(2026, 10, 16, 9, 30).toISOString(),
  endAt: new Date(2026, 10, 16, 10, 45).toISOString(),
  source: 'rise',
  eventType: 'class',
  location: 'ECS 304',
};

const project: CalendarEvent = {
  id: 'project',
  userId: 'user-1',
  title: 'CECS 449 Project 1',
  startAt: new Date(2026, 10, 23, 22, 59).toISOString(),
  endAt: new Date(2026, 10, 23, 23, 59).toISOString(),
  source: 'canvas',
  eventType: 'assignment',
};

async function renderSheet() {
  const onSelectEvent = jest.fn();
  const onClose = jest.fn();
  await render(<CalendarSearchSheet visible onClose={onClose} onSelectEvent={onSelectEvent} />);
  return { onSelectEvent, onClose };
}

/** Types into the search field and waits out the pause before searching. */
async function typeSearch(text: string) {
  await fireEvent.changeText(screen.getByLabelText('Search calendar'), text);
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 10, 13, 9, 0) });
  mockSearchCalendarEvents.mockReset();
  mockSearchCalendarEvents.mockResolvedValue([lecture, project]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CalendarSearchSheet (#78)', () => {
  it('starts empty, without searching', async () => {
    await renderSheet();

    expect(screen.getByLabelText('Search calendar')).toHaveDisplayValue('');
    expect(mockSearchCalendarEvents).not.toHaveBeenCalled();
  });

  it('shows each match with its title, date, time, and location (AC1, AC5)', async () => {
    await renderSheet();
    await typeSearch(' cecs ');

    expect(mockSearchCalendarEvents).toHaveBeenCalledWith('cecs');
    expect(await screen.findByRole('button', { name: 'CECS 449 Lecture, Mon, Nov 16 9:30 AM, ECS 304' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'CECS 449 Project 1, Mon, Nov 23 10:59 PM' })).toBeOnTheScreen();
  });

  it('searches once typing pauses, not on every key', async () => {
    await renderSheet();
    const field = screen.getByLabelText('Search calendar');

    await fireEvent.changeText(field, 'c');
    await fireEvent.changeText(field, 'ce');
    await fireEvent.changeText(field, 'cec');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockSearchCalendarEvents).toHaveBeenCalledTimes(1);
    expect(mockSearchCalendarEvents).toHaveBeenCalledWith('cec');
  });

  it('narrows the results with the type chips', async () => {
    await renderSheet();
    await typeSearch('cecs');
    await screen.findByRole('button', { name: /^CECS 449 Lecture, / });

    await fireEvent.press(screen.getByRole('button', { name: 'Assignments' }));

    expect(screen.queryByRole('button', { name: /^CECS 449 Lecture, / })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^CECS 449 Project 1, / })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Assignments', selected: true })).toBeOnTheScreen();
  });

  it('hands back the tapped event (AC6)', async () => {
    const { onSelectEvent } = await renderSheet();
    await typeSearch('cecs');

    await fireEvent.press(await screen.findByRole('button', { name: /^CECS 449 Project 1, / }));

    expect(onSelectEvent).toHaveBeenCalledWith(project);
  });

  it('clears the search with the clear button (AC7)', async () => {
    await renderSheet();
    await typeSearch('cecs');
    await screen.findByRole('button', { name: /^CECS 449 Lecture, / });

    await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));

    expect(screen.getByLabelText('Search calendar')).toHaveDisplayValue('');
    expect(screen.queryByRole('button', { name: /^CECS 449 Lecture, / })).not.toBeOnTheScreen();
  });

  it('says when nothing matches (AC8)', async () => {
    mockSearchCalendarEvents.mockResolvedValue([]);
    await renderSheet();
    await typeSearch('chemistry');

    expect(await screen.findByText('No events match “chemistry”')).toBeOnTheScreen();
  });

  it('says when nothing matches the chosen type', async () => {
    await renderSheet();
    await typeSearch('cecs');
    await screen.findByRole('button', { name: /^CECS 449 Lecture, / });

    await fireEvent.press(screen.getByRole('button', { name: 'Wellness' }));

    expect(screen.getByText('No events match “cecs”')).toBeOnTheScreen();
  });

  it('says when the search fails', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    mockSearchCalendarEvents.mockRejectedValue(new Error('offline'));
    await renderSheet();
    await typeSearch('cecs');

    expect(
      await screen.findByText("Couldn't search your calendar. Check your connection and try again."),
    ).toBeOnTheScreen();
  });

  it('closes with ✕', async () => {
    const { onClose } = await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalled();
  });
});

describe('formatSearchResultTime', () => {
  const now = new Date(2026, 10, 13);

  it('shows the year only for another year', () => {
    expect(formatSearchResultTime(lecture, now)).toBe('Mon, Nov 16 9:30 AM');
    expect(
      formatSearchResultTime(
        { ...lecture, startAt: new Date(2027, 0, 4, 9, 30).toISOString(), endAt: new Date(2027, 0, 4, 10).toISOString() },
        now,
      ),
    ).toBe('Mon, Jan 4, 2027 9:30 AM');
  });

  it('says All day for an all-day event', () => {
    const allDay = { ...lecture, startAt: new Date(2026, 10, 26).toISOString(), endAt: new Date(2026, 10, 27).toISOString() };

    expect(formatSearchResultTime(allDay, now)).toBe('Thu, Nov 26 · All day');
  });
});
