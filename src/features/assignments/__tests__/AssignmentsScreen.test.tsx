import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import { AssignmentsScreen } from '../screens/AssignmentsScreen';

const mockFetchAssignments = jest.fn();

// Monday, November 9, 2026 at noon, local time.
const mockNow = new Date(2026, 10, 9, 12, 0);

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  // Run the effect as if List is open.
  return {
    useFocusEffect: (effect: () => () => void) => useEffect(effect, [effect]),
    useNavigation: () => ({ navigate: jest.fn() }),
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
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: 'student' } } },
        error: null,
      }),
    },
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

const titlesOnScreen = () =>
  screen
    .getAllByRole('button', { name: /Course:/ })
    .map((card) => card.props.accessibilityLabel.split('.')[0]);

describe('AssignmentsScreen', () => {
  beforeEach(() => {
    mockFetchAssignments.mockReset();
  });

  it('lists urgent unfinished work first and excludes completed work', async () => {
    mockFetchAssignments.mockResolvedValue([
      assignment({ id: 'done', title: 'Finished Lab', completed: true }),
      assignment({
        id: 'old',
        title: 'Week 1 Reading',
        dueAt: new Date(2026, 8, 1),
      }),
      assignment({
        id: 'later',
        title: 'Essay',
        dueAt: new Date(2026, 10, 20),
      }),
      assignment({
        id: 'overdue',
        title: 'Quiz 3',
        dueAt: new Date(2026, 10, 8),
      }),
      assignment({
        id: 'soon',
        title: 'Problem Set 6',
        dueAt: new Date(2026, 10, 10),
      }),
    ]);

    await render(<AssignmentsScreen />);

    expect(
      await screen.findByLabelText('Show 1 past assignments'),
    ).toBeTruthy();

    expect(titlesOnScreen()).toEqual([
      'Quiz 3',
      'Problem Set 6',
      'Essay',
    ]);

    expect(screen.queryByText('Finished Lab')).toBeNull();
    expect(screen.getByText('Overdue')).toBeTruthy();
    expect(screen.getByText('High Priority')).toBeTruthy();
  });

  it('keeps completed work hidden even when Past is expanded', async () => {
    mockFetchAssignments.mockResolvedValue([
      assignment({
        id: 'old',
        title: 'Week 1 Reading',
        dueAt: new Date(2026, 8, 1),
      }),
      assignment({
        id: 'done-past',
        title: 'Finished Lab',
        dueAt: new Date(2026, 10, 6),
        completed: true,
      }),
      assignment({
        id: 'done-future',
        title: 'Finished Essay',
        completed: true,
      }),
      assignment({ id: 'later', title: 'Essay' }),
    ]);

    await render(<AssignmentsScreen />);

    await fireEvent.press(
      await screen.findByLabelText('Show 1 past assignments'),
    );

    expect(titlesOnScreen()).toEqual(['Essay', 'Week 1 Reading']);
    expect(screen.queryByText('Finished Lab')).toBeNull();
    expect(screen.queryByText('Finished Essay')).toBeNull();
    expect(screen.getByLabelText('Hide past assignments')).toBeTruthy();
  });

  it('says everything is done when only completed assignments remain', async () => {
    mockFetchAssignments.mockResolvedValue([
      assignment({ title: 'Finished Work', completed: true }),
    ]);

    await render(<AssignmentsScreen />);

    expect(
      await screen.findByText('You’re all caught up!'),
    ).toBeTruthy();

    expect(screen.queryByText('Finished Work')).toBeNull();
    expect(screen.queryByText('Past')).toBeNull();
  });

  it('keeps unfinished work older than two weeks available', async () => {
    mockFetchAssignments.mockResolvedValue([
      assignment({
        id: 'old',
        title: 'Unfinished September Reading',
        dueAt: new Date(2026, 8, 1),
      }),
    ]);

    await render(<AssignmentsScreen />);

    const showPast = await screen.findByLabelText(
      'Show 1 past assignments',
    );

    // Old unfinished work must not cause a misleading all-done message.
    expect(screen.queryByText('You’re all caught up!')).toBeNull();

    await fireEvent.press(showPast);

    expect(
      screen.getByText('Unfinished September Reading'),
    ).toBeTruthy();
  });

  it('keeps unfinished future assignments and assignments without due dates', async () => {
    mockFetchAssignments.mockResolvedValue([
      assignment({
        id: 'future',
        title: 'Long Term Project',
        dueAt: new Date(2027, 3, 1),
      }),
      assignment({
        id: 'no-date',
        title: 'Undated Homework',
        dueAt: null,
      }),
    ]);

    await render(<AssignmentsScreen />);

    expect(await screen.findByText('Long Term Project')).toBeTruthy();
    expect(screen.getByText('Undated Homework')).toBeTruthy();
    expect(screen.queryByText('You’re all caught up!')).toBeNull();
  });

  it('shows the existing empty state when no assignments exist', async () => {
    mockFetchAssignments.mockResolvedValue([]);

    await render(<AssignmentsScreen />);

    expect(
      await screen.findByText('No assignments to display.'),
    ).toBeTruthy();

    expect(screen.queryByText('You’re all caught up!')).toBeNull();
  });
});