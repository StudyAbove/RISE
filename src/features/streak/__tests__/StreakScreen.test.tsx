import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import { StreakScreen } from '../screens/StreakScreen';
import { getResetMessage } from '../utils/resetMessages';

const mockFetchAssignments = jest.fn();

// Wednesday, November 11, 2026 at 9 PM, local time.
const mockNow = new Date(2026, 10, 11, 21, 0);

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  // Run the effect as if the screen is open.
  return {
    useFocusEffect: (effect: () => () => void) => useEffect(effect, [effect]),
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../hooks/useCurrentDate', () => ({
  useCurrentDate: () => mockNow,
}));

jest.mock('../../../components/BackButton', () => ({
  BackButton: () => null,
}));

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'student' } } }, error: null }) },
  },
}));

jest.mock('../../../repositories/assignmentsRepository', () => ({
  fetchAssignments: () => mockFetchAssignments(),
}));

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

describe('StreakScreen', () => {
  beforeEach(() => {
    mockFetchAssignments.mockReset();
    mockNavigate.mockReset();
  });

  it('shows the current streak, longest streak, total weeks, and this week', async () => {
    mockFetchAssignments.mockResolvedValue([
      // A 3-day streak last week, broken by a missed assignment on the 7th.
      onTime(4),
      onTime(5),
      onTime(6),
      { ...onTime(7), completed: false, completedAt: null },
      onTime(9),
      onTime(10),
    ]);

    await render(<StreakScreen />);

    expect(await screen.findByText('2 days')).toBeTruthy();
    expect(screen.getByText('days and counting!')).toBeTruthy();
    expect(screen.getByLabelText('Current Streak: 2')).toBeTruthy();
    expect(screen.getByLabelText('Longest Streak: 3')).toBeTruthy();
    expect(screen.getByLabelText('Total Weeks: 2')).toBeTruthy();

    expect(screen.getByLabelText('Monday, November 9, turned in on time')).toBeTruthy();
    expect(screen.getByLabelText('Tuesday, November 10, turned in on time')).toBeTruthy();
    expect(screen.getByLabelText('Wednesday, November 11, today')).toBeTruthy();
    expect(screen.getByLabelText('Thursday, November 12, upcoming')).toBeTruthy();
  });

  it('encourages starting a streak when there is none', async () => {
    mockFetchAssignments.mockResolvedValue([]);

    await render(<StreakScreen />);

    expect(await screen.findByText('0 days')).toBeTruthy();
    expect(screen.getByText('Turn something in on time to start a streak.')).toBeTruthy();
    expect(screen.getByLabelText('Current Streak: 0')).toBeTruthy();
    expect(screen.getByLabelText('Longest Streak: 0')).toBeTruthy();
  });

  describe('longest streak (#8)', () => {
    it('keeps the personal best after the current streak resets', async () => {
      mockFetchAssignments.mockResolvedValue([
        onTime(5),
        onTime(6),
        onTime(7),
        onTime(8),
        { ...onTime(10), completed: false, completedAt: null },
      ]);

      await render(<StreakScreen />);

      expect(await screen.findByText('0 days')).toBeTruthy();
      expect(screen.getByLabelText('Current Streak: 0')).toBeTruthy();
      expect(screen.getByLabelText('Longest Streak: 4')).toBeTruthy();
    });

    it('shows the same number for both when the current streak is the best', async () => {
      mockFetchAssignments.mockResolvedValue([onTime(7), onTime(8), onTime(9), onTime(10), onTime(11)]);

      await render(<StreakScreen />);

      expect(await screen.findByText('5 days')).toBeTruthy();
      expect(screen.getByLabelText('Current Streak: 5')).toBeTruthy();
      expect(screen.getByLabelText('Longest Streak: 5')).toBeTruthy();
    });

    it('shows long streaks in full', async () => {
      // 120 days in a row, ending today (dates before November roll back into
      // earlier months).
      mockFetchAssignments.mockResolvedValue(
        Array.from({ length: 120 }, (_, index) => onTime(11 - index)),
      );

      await render(<StreakScreen />);

      expect(await screen.findByText('120 days')).toBeTruthy();
      expect(screen.getByLabelText('Current Streak: 120')).toBeTruthy();
      expect(screen.getByLabelText('Longest Streak: 120')).toBeTruthy();
    });
  });

  it('offers to try again when the streak fails to load', async () => {
    mockFetchAssignments.mockRejectedValueOnce(new Error('offline'));
    mockFetchAssignments.mockResolvedValueOnce([onTime(11)]);

    await render(<StreakScreen />);

    expect(await screen.findByText('Couldn’t load your streak.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Try again'));

    expect(await screen.findByText('1 day')).toBeTruthy();
  });

  describe('after a streak ends (#11)', () => {
    const notDone = (day: number) => ({ ...onTime(day), completed: false, completedAt: null });

    it('says how long the streak was and encourages starting again', async () => {
      mockFetchAssignments.mockResolvedValue([onTime(6), onTime(7), onTime(8), notDone(9)]);

      await render(<StreakScreen />);

      expect(await screen.findByText('0 days')).toBeTruthy();
      expect(screen.getByText('Your 3-day streak ended, and that still counts.')).toBeTruthy();
      expect(screen.getByText(getResetMessage(mockNow))).toBeTruthy();
      expect(screen.queryByText(/brighter tomorrows/)).toBeNull();
    });

    it('goes back to normal once a new streak starts', async () => {
      mockFetchAssignments.mockResolvedValue([onTime(6), onTime(7), notDone(8), onTime(10)]);

      await render(<StreakScreen />);

      expect(await screen.findByText('1 day')).toBeTruthy();
      expect(screen.getByText('days and counting!')).toBeTruthy();
      expect(screen.getByText(/brighter tomorrows/)).toBeTruthy();
      expect(screen.queryByText(getResetMessage(mockNow))).toBeNull();
    });

    it('keeps the first-streak message when no streak has ended', async () => {
      mockFetchAssignments.mockResolvedValue([notDone(10)]);

      await render(<StreakScreen />);

      expect(await screen.findByText('Turn something in on time to start a streak.')).toBeTruthy();
      expect(screen.getByText(/brighter tomorrows/)).toBeTruthy();
    });
  });

  describe('this streak (#10)', () => {
    it('lists what kept the streak going, newest first, and opens one when tapped', async () => {
      mockFetchAssignments.mockResolvedValue([
        { ...onTime(9), title: 'Lab 1' },
        { ...onTime(10), title: 'Quiz 2' },
      ]);

      await render(<StreakScreen />);

      expect(await screen.findByRole('header', { name: 'This streak' })).toBeTruthy();

      const rows = screen.getAllByLabelText(/Turned in/);
      expect(rows.map((row) => row.props.accessibilityLabel)).toEqual([
        'Quiz 2, EE 381, Turned in Tue, Nov 10',
        'Lab 1, EE 381, Turned in Mon, Nov 9',
      ]);

      await fireEvent.press(rows[1]);
      expect(mockNavigate).toHaveBeenCalledWith('AssignmentDetails', { assignmentId: 'a9' });
    });

    it('shows the 5 newest until Show all is tapped', async () => {
      mockFetchAssignments.mockResolvedValue(
        Array.from({ length: 7 }, (_, index) => onTime(5 + index)),
      );

      await render(<StreakScreen />);

      expect(await screen.findAllByLabelText(/Turned in/)).toHaveLength(5);
      expect(screen.getByLabelText(/Turned in Wed, Nov 11/)).toBeTruthy();
      expect(screen.queryByLabelText(/Turned in Thu, Nov 5/)).toBeNull();

      await fireEvent.press(screen.getByRole('button', { name: 'Show all (7)' }));

      expect(screen.getAllByLabelText(/Turned in/)).toHaveLength(7);
      expect(screen.queryByRole('button', { name: /Show all/ })).toBeNull();
    });

    it('is hidden with no current streak', async () => {
      mockFetchAssignments.mockResolvedValue([
        onTime(8),
        { ...onTime(10), completed: false, completedAt: null },
      ]);

      await render(<StreakScreen />);

      expect(await screen.findByText('0 days')).toBeTruthy();
      expect(screen.queryByRole('header', { name: 'This streak' })).toBeNull();
    });
  });
});
