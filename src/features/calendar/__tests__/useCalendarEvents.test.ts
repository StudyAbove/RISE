import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { useCalendarEvents } from '../hooks/useCalendarEvents';

const mockGetCalendarEventsInRange = jest.fn();
jest.mock('../../../repositories/calendarEventsRepository', () => ({
  getCalendarEventsInRange: (...args: unknown[]) => mockGetCalendarEventsInRange(...args),
}));

const lecture: CalendarEvent = {
  id: 'event-1',
  userId: 'user-1',
  title: 'Biology Lecture',
  startAt: '2026-11-13T17:00:00.000Z',
  endAt: '2026-11-13T18:30:00.000Z',
  source: 'rise',
};

const weekStart = new Date(2026, 10, 8);
const weekEnd = new Date(2026, 10, 15);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

describe('useCalendarEvents', () => {
  it('starts loading, then returns the events for the range', async () => {
    mockGetCalendarEventsInRange.mockResolvedValue([lecture]);

    const { result } = await renderHook(() => useCalendarEvents(weekStart, weekEnd));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.events).toEqual([lecture]);
    expect(mockGetCalendarEventsInRange).toHaveBeenCalledWith(weekStart, weekEnd);
  });

  it('does not reload when re-rendered with an equal range', async () => {
    mockGetCalendarEventsInRange.mockResolvedValue([]);

    const { rerender, result } = await renderHook(
      ({ start, end }: { start: Date; end: Date }) => useCalendarEvents(start, end),
      { initialProps: { start: weekStart, end: weekEnd } }
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await rerender({ start: new Date(weekStart), end: new Date(weekEnd) });

    expect(mockGetCalendarEventsInRange).toHaveBeenCalledTimes(1);
  });

  it('reports an error, then loads again on retry', async () => {
    mockGetCalendarEventsInRange.mockRejectedValueOnce(new Error('Network request failed'));
    mockGetCalendarEventsInRange.mockResolvedValueOnce([lecture]);

    const { result } = await renderHook(() => useCalendarEvents(weekStart, weekEnd));
    await waitFor(() => expect(result.current.status).toBe('error'));

    await act(async () => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.events).toEqual([lecture]);
  });
});
