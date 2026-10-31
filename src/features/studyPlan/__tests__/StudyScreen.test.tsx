import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import { StudyScreen } from '../screens/StudyScreen';

const mockFetchAssignments = jest.fn();
const mockNavigate = jest.fn();

// Monday, November 9, 2026 at noon, local time.
const mockNow = new Date(2026, 10, 9, 12, 0);

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  // Run the effect as if Study is open.
  return {
    useFocusEffect: (effect: () => () => void) => useEffect(effect, [effect]),
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../hooks/useScrollToTopOnTabPress', () => ({
  useScrollToTopOnTabPress: () => ({ onScroll: undefined }),
}));

jest.mock('../../../hooks/useCurrentDate', () => ({
  useCurrentDate: () => mockNow,
}));

jest.mock('../../home/components/HomeSkyBackdrop', () => ({
  HomeSkyBackdrop: () => null,
}));

jest.mock('../../settings/components/SettingsButton', () => ({
  SettingsButton: () => null,
}));

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'student' } } }, error: null }) },
  },
}));

jest.mock('../../../repositories/assignmentsRepository', () => ({
  fetchAssignments: () => mockFetchAssignments(),
}));

function assignment(overrides: Partial<Assignment>): Assignment {
  return {
    id: 'a1',
    title: 'Problem Set',
    description: null,
    dueAt: new Date(2026, 10, 20, 23, 59),
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

describe('StudyScreen', () => {
  beforeEach(() => {
    mockFetchAssignments.mockReset();
    mockNavigate.mockClear();
  });

  it('groups unfinished work into Overdue, Due Today, and Upcoming', async () => {
    mockFetchAssignments.mockResolvedValue([
      assignment({ id: 'o', title: 'Quiz 3', dueAt: new Date(2026, 10, 8) }),
      assignment({ id: 't', title: 'Lab 4', dueAt: new Date(2026, 10, 9, 23, 59) }),
      assignment({ id: 'u', title: 'Essay', dueAt: new Date(2026, 10, 12) }),
      assignment({ id: 'd', title: 'Finished Lab', dueAt: new Date(2026, 10, 10), completed: true }),
      assignment({ id: 'l', title: 'Final Project', dueAt: new Date(2026, 11, 10) }),
    ]);

    await render(<StudyScreen />);

    expect(await screen.findByRole('header', { name: 'Overdue' })).toBeTruthy();
    expect(screen.getByText('Due Today')).toBeTruthy();
    expect(screen.getByText('Upcoming')).toBeTruthy();
    expect(screen.getByText('Quiz 3')).toBeTruthy();
    expect(screen.getByText('Lab 4')).toBeTruthy();
    expect(screen.getByText('Essay')).toBeTruthy();

    // Completed work and work due after this week stay on List.
    expect(screen.queryByText('Finished Lab')).toBeNull();
    expect(screen.queryByText('Final Project')).toBeNull();
  });

  it('skips Overdue when nothing is overdue and says when a section is empty', async () => {
    mockFetchAssignments.mockResolvedValue([
      assignment({ title: 'Essay', dueAt: new Date(2026, 10, 12) }),
    ]);

    await render(<StudyScreen />);

    expect(await screen.findByText('Nothing due today.')).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'Overdue' })).toBeNull();
  });

  it('opens List from View all', async () => {
    mockFetchAssignments.mockResolvedValue([
      assignment({ title: 'Essay', dueAt: new Date(2026, 10, 12) }),
    ]);

    await render(<StudyScreen />);
    await fireEvent.press((await screen.findAllByLabelText('View all assignments'))[0]);

    expect(mockNavigate).toHaveBeenCalledWith('List');
  });
});
