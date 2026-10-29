import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import { HighPriorityTasks } from '../components/HighPriorityTasks';
import type { HighPriorityTask } from '../utils/highPriorityTasks';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Monday, November 9, 2026 at 9 AM, local time.
const now = new Date(2026, 10, 9, 9, 0);

function assignment(overrides: Partial<Assignment>): Assignment {
  return {
    id: 'a1',
    title: 'Problem Set #5',
    description: 'Solve problems 1-10.',
    dueAt: new Date(2026, 10, 9, 23, 59),
    completed: false,
    source: 'canvas',
    courseName: 'Electrical Engineering',
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

describe('HighPriorityTasks', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('shows due-soon and get-ahead cards with the class instead of the description', async () => {
    const tasks: HighPriorityTask[] = [
      { assignment: assignment({}), reason: 'dueSoon' },
      {
        assignment: assignment({
          id: 'a2',
          title: 'Milestone #4',
          courseCode: 'CECS 491B',
          dueAt: new Date(2026, 10, 14, 23, 59),
        }),
        reason: 'getAhead',
      },
    ];

    await render(<HighPriorityTasks tasks={tasks} now={now} />);

    expect(screen.getByText('High Priority Tasks')).toBeOnTheScreen();
    expect(screen.getByText('Problem Set #5')).toBeOnTheScreen();
    expect(screen.getByText('EE 381')).toBeOnTheScreen();
    expect(screen.getByText('Due Mon, Nov 9')).toBeOnTheScreen();
    expect(screen.getByText('Get ahead ·', { exact: false })).toBeOnTheScreen();
    expect(screen.getByText('Due Sat, Nov 14', { exact: false })).toBeOnTheScreen();
    expect(screen.queryByText('Solve problems 1-10.')).not.toBeOnTheScreen();
    expect(screen.queryByText('0%')).not.toBeOnTheScreen();
  });

  it('shows at most 3 tasks', async () => {
    const tasks: HighPriorityTask[] = ['1', '2', '3', '4'].map((id) => ({
      assignment: assignment({ id, title: `Task ${id}` }),
      reason: 'dueSoon',
    }));

    await render(<HighPriorityTasks tasks={tasks} now={now} />);

    expect(screen.getByText('Task 3')).toBeOnTheScreen();
    expect(screen.queryByText('Task 4')).not.toBeOnTheScreen();
  });

  it('says the student is all caught up when there is nothing to do', async () => {
    await render(<HighPriorityTasks tasks={[]} now={now} />);

    expect(screen.getByText('You’re all caught up!')).toBeOnTheScreen();
  });

  it('opens List from View all', async () => {
    await render(<HighPriorityTasks tasks={[]} now={now} />);

    await fireEvent.press(screen.getByRole('link', { name: 'View all' }));

    expect(mockNavigate).toHaveBeenCalledWith('MainTabs', { screen: 'List' });
  });
});
