import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import { useHomeData } from '../hooks/useHomeData';

const mockFetchAssignments = jest.fn();
const mockRequestEstimates = jest.fn();
const mockGetEvents = jest.fn();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  // Run the effect as if Home is open.
  return { useFocusEffect: (effect: () => () => void) => useEffect(effect, [effect]) };
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

describe('useHomeData', () => {
  let appStateListener: ((state: string) => void) | undefined;

  beforeEach(() => {
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
