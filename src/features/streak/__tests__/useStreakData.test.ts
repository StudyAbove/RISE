import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import { useStreakData } from '../hooks/useStreakData';

const mockFetchAssignments = jest.fn();
const mockGetSession = jest.fn();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  // Run the effect as if the Streak page is open.
  return { useFocusEffect: (effect: () => () => void) => useEffect(effect, [effect]) };
});

jest.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession: () => mockGetSession() } },
}));

jest.mock('../../../repositories/assignmentsRepository', () => ({
  fetchAssignments: () => mockFetchAssignments(),
}));

// Wednesday, November 11, 2026 at 9 PM, local time.
const now = new Date(2026, 10, 11, 21, 0);

/** Turned in on November `day` at noon, due that night. */
function onTime(day: number): Assignment {
  return {
    id: `a${day}`,
    title: 'Problem Set',
    description: null,
    dueAt: new Date(2026, 10, day, 23, 59),
    completed: true,
    completedAt: new Date(2026, 10, day, 12, 0),
    source: 'canvas',
    courseName: null,
    courseCode: 'EE 381',
    courseColor: '#8FA8F0',
    courseTint: '#E3E9FC',
    pointsPossible: null,
    htmlUrl: null,
    estimatedMinutes: 60,
    kind: 'homework',
  };
}

describe('useStreakData', () => {
  let appStateListener: ((state: string) => void) | undefined;

  beforeEach(() => {
    mockFetchAssignments.mockReset();
    mockGetSession.mockReset();
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'student' } } },
      error: null,
    });

    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListener = listener as (state: string) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('works out the streak from the loaded assignments', async () => {
    mockFetchAssignments.mockResolvedValue([onTime(9), onTime(10)]);

    const { result } = await renderHook(() => useStreakData(now));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.streak).toMatchObject({ current: 2, longest: 2 });
  });

  it('reloads when the app comes back to the foreground', async () => {
    mockFetchAssignments.mockResolvedValueOnce([onTime(10)]);

    const { result } = await renderHook(() => useStreakData(now));
    await waitFor(() => expect(result.current.streak?.current).toBe(1));

    mockFetchAssignments.mockResolvedValueOnce([onTime(10), onTime(11)]);
    await act(async () => appStateListener?.('active'));

    await waitFor(() => expect(result.current.streak?.current).toBe(2));
  });

  it('reports an error when assignments fail to load', async () => {
    mockFetchAssignments.mockRejectedValue(new Error('offline'));

    const { result } = await renderHook(() => useStreakData(now));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.streak).toBeNull();
  });

  it('loads again when reload is called', async () => {
    mockFetchAssignments.mockRejectedValueOnce(new Error('offline'));

    const { result } = await renderHook(() => useStreakData(now));
    await waitFor(() => expect(result.current.status).toBe('error'));

    mockFetchAssignments.mockResolvedValueOnce([onTime(11)]);
    await act(async () => result.current.reload());

    await waitFor(() => expect(result.current.streak?.current).toBe(1));
  });

  it('is signedOut with no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = await renderHook(() => useStreakData(now));

    await waitFor(() => expect(result.current.status).toBe('signedOut'));
    expect(mockFetchAssignments).not.toHaveBeenCalled();
  });
});
