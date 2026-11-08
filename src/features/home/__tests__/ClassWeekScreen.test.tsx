import { render, screen } from '@testing-library/react-native';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import { ClassWeekScreen } from '../screens/ClassWeekScreen';

const mockFetchAssignments = jest.fn();

// Monday, November 9, 2026 at 9 AM, local time.
const mockNow = new Date(2026, 10, 9, 9, 0);

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  // Run the effect as if the screen is open.
  return {
    useFocusEffect: (effect: () => () => void) => useEffect(effect, [effect]),
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true }),
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

function assignment(overrides: Partial<Assignment>): Assignment {
  return {
    id: overrides.title ?? 'a1',
    title: 'Problem Set',
    description: null,
    dueAt: new Date(2026, 10, 12, 23, 59),
    completed: false,
    source: 'canvas',
    courseId: 'ee381',
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

const route = { key: 'ClassWeek', name: 'ClassWeek', params: { courseId: 'ee381', courseLabel: 'EE 381' } } as const;

function renderScreen() {
  // Navigation is only used by the back button, which is mocked.
  return render(<ClassWeekScreen route={route} navigation={{} as never} />);
}

describe('ClassWeekScreen', () => {
  beforeEach(() => {
    mockFetchAssignments.mockReset();
  });

  it('shows only this class’s assignments due this week, all of them', async () => {
    mockFetchAssignments.mockResolvedValue([
      assignment({ title: 'Quiz 4', dueAt: new Date(2026, 10, 10, 9, 0) }),
      assignment({ title: 'Lab 5' }),
      assignment({ title: 'Problem Set 6', dueAt: new Date(2026, 10, 13, 9, 0) }),
      assignment({ title: 'Reading 7', dueAt: new Date(2026, 10, 14, 9, 0) }),
      assignment({ title: 'Cell Lab', courseId: 'bio200', courseCode: 'BIO 200' }),
    ]);

    await renderScreen();

    expect(await screen.findByText('4 assignments due in the next 7 days')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'EE 381' })).toBeTruthy();

    const titles = screen
      .getAllByRole('button', { name: /Course:/ })
      .map((card) => card.props.accessibilityLabel.split('.')[0]);

    expect(titles).toEqual(['Quiz 4', 'Lab 5', 'Problem Set 6', 'Reading 7']);
  });

  it('says when nothing is left for the class this week', async () => {
    mockFetchAssignments.mockResolvedValue([assignment({ completed: true })]);

    await renderScreen();

    expect(await screen.findByText('Nothing left for this class this week.')).toBeTruthy();
  });
});
