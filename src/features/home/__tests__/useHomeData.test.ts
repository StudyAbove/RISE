import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import { useHomeData } from '../hooks/useHomeData';
import { calculateStreak } from '../../streak/utils/streak';

const mockFetchAssignments = jest.fn();
const mockRequestEstimates = jest.fn();
const mockGetEvents = jest.fn();

let mockHomeFocused = true;

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');

  return {
    useFocusEffect: (effect: () => () => void) =>
      useEffect(() => {
        if (mockHomeFocused) return effect();
      }, [effect, mockHomeFocused]),
  };
});

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'student' } } }, error: null }) },
  },
}));

jest.mock('../../../repositories/assignmentsRepository', () => ({
  fetchAssignments: () => mockFetchAssignments(),
  requestAssignmentEstimates: () => mockRequestEstimates(),
}));

jest.mock('../../../repositories/calendarEventsRepository', () => ({
  getCalendarEventsInRange: () => mockGetEvents(),
}));

function assignment(overrides: Partial<Assignment>): Assignment {
  return {
    id: 'a1',
    title: 'Problem Set',
    description: null,
    dueAt: new Date(2026, 10, 12, 23, 59),
    completed: false,
    source: 'canvas',
    courseName: null,
    courseCode: 'EE 381',
    courseColor: '#8FA8F0',
    courseTint: '#E3E9FC',
    pointsPossible: null,
    htmlUrl: null,
    estimatedMinutes: 60,
    kind: 'homework',
    ...overrides,
  };
}


// Fixed date so streak tests do not expire over time.
const STREAK_NOW = new Date(2026, 10, 13, 21, 0);

function onTimeAssignment(day: number, id = `streak-${day}`): Assignment {
  return assignment({
    id,
    completed: true,
    completedAt: new Date(2026, 10, day, 12, 0),
    dueAt: new Date(2026, 10, day, 23, 59),
  });
}

describe('useHomeData', () => {
  let appStateListener: ((state: string) => void) | undefined;

  beforeEach(() => {
    mockHomeFocused = true;
    mockFetchAssignments.mockReset();
    mockRequestEstimates.mockReset();
    mockGetEvents.mockReset();
    mockGetEvents.mockResolvedValue([]);

    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListener = listener as (state: string) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });


  it('provides assignment data for an active Home streak', async () => {
    mockFetchAssignments.mockResolvedValue([
      onTimeAssignment(9),
      onTimeAssignment(10),
      onTimeAssignment(11),
    ]);

    const { result } = await renderHook(() => useHomeData());

    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(
      calculateStreak(result.current.assignments, STREAK_NOW).current,
    ).toBe(3);
  });

  it('updates the streak after another on-time submission day', async () => {
    const initial = [
      onTimeAssignment(9),
      onTimeAssignment(10),
      onTimeAssignment(11),
    ];

    mockFetchAssignments.mockResolvedValueOnce(initial);

    const { result } = await renderHook(() => useHomeData());

    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(
      calculateStreak(result.current.assignments, STREAK_NOW).current,
    ).toBe(3);

    mockFetchAssignments.mockResolvedValueOnce([
      ...initial,
      onTimeAssignment(12),
    ]);

    await act(async () => {
      appStateListener?.('active');
    });

    await waitFor(() => {
      expect(
        calculateStreak(result.current.assignments, STREAK_NOW).current,
      ).toBe(4);
    });
  });

  it('refreshes the streak when the student returns to Home', async () => {
    const initial = [
      onTimeAssignment(9),
      onTimeAssignment(10),
      onTimeAssignment(11),
    ];

    mockFetchAssignments.mockResolvedValueOnce(initial);

    const { result, rerender } = await renderHook(
      () => useHomeData(),
    );

    await waitFor(() =>
      expect(result.current.status).toBe('ready'),
    );

    expect(
      calculateStreak(result.current.assignments, STREAK_NOW).current,
    ).toBe(3);

    expect(mockFetchAssignments).toHaveBeenCalledTimes(1);

    // Student navigates away from Home.
    mockHomeFocused = false;
    await rerender(undefined);

    mockFetchAssignments.mockResolvedValueOnce([
      ...initial,
      onTimeAssignment(12),
    ]);

    // Student returns to Home.
    mockHomeFocused = true;
    await rerender(undefined);

    await waitFor(() => {
      expect(
        calculateStreak(result.current.assignments, STREAK_NOW).current,
      ).toBe(4);
    });

    expect(mockFetchAssignments).toHaveBeenCalledTimes(2);
  });

  it('provides a zero streak when there are no submissions', async () => {
    mockFetchAssignments.mockResolvedValue([]);

    const { result } = await renderHook(() => useHomeData());

    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(
      calculateStreak(result.current.assignments, STREAK_NOW).current,
    ).toBe(0);
  });

  it('does not increase the streak twice for the same submission day', async () => {
    mockFetchAssignments.mockResolvedValue([
      onTimeAssignment(10),
      onTimeAssignment(11, 'first-submission'),
      onTimeAssignment(11, 'second-submission'),
    ]);

    const { result } = await renderHook(() => useHomeData());

    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(
      calculateStreak(result.current.assignments, STREAK_NOW).current,
    ).toBe(2);
  });

  it('resets the streak after a missed assignment', async () => {
    const initial = [
      onTimeAssignment(9),
      onTimeAssignment(10),
      onTimeAssignment(11),
    ];

    mockFetchAssignments.mockResolvedValueOnce(initial);

    const { result } = await renderHook(() => useHomeData());

    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(
      calculateStreak(result.current.assignments, STREAK_NOW).current,
    ).toBe(3);

    mockFetchAssignments.mockResolvedValueOnce([
      ...initial,
      assignment({
        id: 'missed-assignment',
        completed: false,
        completedAt: null,
        dueAt: new Date(2026, 10, 12, 23, 59),
      }),
    ]);

    await act(async () => {
      appStateListener?.('active');
    });

    await waitFor(() => {
      expect(
        calculateStreak(result.current.assignments, STREAK_NOW).current,
      ).toBe(0);
    });
  });

  it('loads assignments and how busy each day is', async () => {
    mockFetchAssignments.mockResolvedValue([assignment({})]);
    mockGetEvents.mockResolvedValue([
      {
        id: 'e1',
        userId: 'student',
        title: 'Shift',
        startAt: new Date(2026, 10, 10, 9, 0).toISOString(),
        endAt: new Date(2026, 10, 10, 17, 0).toISOString(),
        source: 'rise',
      },
    ]);

    const { result } = await renderHook(() => useHomeData());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.assignments).toHaveLength(1);
    expect(result.current.eventMinutesByDay.get(new Date(2026, 10, 10).getTime())).toBe(480);
  });

  it('picks up new and finished assignments when the app comes back to the foreground', async () => {
    mockFetchAssignments.mockResolvedValueOnce([assignment({})]);

    const { result } = await renderHook(() => useHomeData());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    mockFetchAssignments.mockResolvedValueOnce([
      assignment({ completed: true }),
      assignment({ id: 'a2', title: 'New Quiz' }),
    ]);

    await act(async () => {
      appStateListener?.('active');
    });

    await waitFor(() => expect(result.current.assignments).toHaveLength(2));
    expect(result.current.assignments[0].completed).toBe(true);
    expect(result.current.assignments[1].title).toBe('New Quiz');
  });

  it('still works from assignments alone if the calendar can’t be read', async () => {
    mockFetchAssignments.mockResolvedValue([assignment({})]);
    mockGetEvents.mockRejectedValue(new Error('offline'));

    const { result } = await renderHook(() => useHomeData());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.eventMinutesByDay.size).toBe(0);
  });
});
