import { render, screen } from '@testing-library/react-native';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import { HighPriorityTasks } from '../components/HighPriorityTasks';
import { hasFinishedPriorityWorkToday } from '../utils/highPriorityTasks';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const now = new Date(2026, 10, 9, 9);
const completedAt = new Date(2026, 10, 9, 8, 30);
const message = 'Nice work! You finished your high-priority tasks.';

function assignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'assignment-1',
    title: 'Problem Set',
    description: null,
    dueAt: new Date(2026, 10, 9, 23, 59),
    completed: false,
    source: 'canvas',
    courseName: 'Biology',
    courseCode: 'BIO 200',
    courseColor: '#A8BEA3',
    courseTint: '#EAF0E8',
    pointsPossible: null,
    htmlUrl: null,
    estimatedMinutes: 60,
    kind: 'homework',
    ...overrides,
  };
}

describe('priority completion (#65)', () => {
  it('recognizes priority work submitted today', () => {
    expect(
      hasFinishedPriorityWorkToday(
        [assignment({ completed: true, completedAt })],
        now,
      ),
    ).toBe(true);
  });

  it('does not celebrate while priority work remains', () => {
    expect(
      hasFinishedPriorityWorkToday(
        [
          assignment({ completed: true, completedAt }),
          assignment({ id: 'unfinished' }),
        ],
        now,
      ),
    ).toBe(false);
  });

  it('does not celebrate an empty account', () => {
    expect(hasFinishedPriorityWorkToday([], now)).toBe(false);
  });

  it.each([
    null,
    undefined,
    new Date('invalid'),
    new Date(2026, 10, 8, 12),
    new Date(2026, 10, 9, 10),
  ])('ignores a missing or nonqualifying completion date: %s', (date) => {
    expect(
      hasFinishedPriorityWorkToday(
        [assignment({ completed: true, completedAt: date })],
        now,
      ),
    ).toBe(false);
  });

  it('does not celebrate completed work outside the priority window', () => {
    expect(
      hasFinishedPriorityWorkToday(
        [
          assignment({
            completed: true,
            completedAt,
            dueAt: new Date(2026, 11, 10),
          }),
        ],
        now,
      ),
    ).toBe(false);
  });

  it('recognizes completed get-ahead work', () => {
    expect(
      hasFinishedPriorityWorkToday(
        [
          assignment({
            completed: true,
            completedAt,
            dueAt: new Date(2026, 10, 14, 9),
            estimatedMinutes: 600,
            kind: 'project',
          }),
        ],
        now,
      ),
    ).toBe(true);
  });

  it('does not treat finished microtasks as submission', () => {
    expect(
      hasFinishedPriorityWorkToday(
        [
          assignment({
            dueAt: null,
            microtasks: [
              {
                id: 'task-1',
                title: 'Review notes',
                position: 1,
                estimatedMinutes: 30,
                completed: true,
              },
            ],
          }),
        ],
        now,
      ),
    ).toBe(false);
  });

  it('shows encouragement after the last priority task is completed', async () => {
    const view = await render(
      <HighPriorityTasks
        tasks={[{ assignment: assignment(), reason: 'dueSoon' }]}
        now={now}
      />,
    );

    expect(screen.queryByText(message)).toBeNull();

    await view.rerender(
      <HighPriorityTasks tasks={[]} now={now} finishedPriorityWork />,
    );

    expect(screen.getByText(message)).toBeOnTheScreen();
    expect(screen.queryByText('Problem Set')).toBeNull();
  });

  it('keeps the normal empty state without completed priority work', async () => {
    await render(<HighPriorityTasks tasks={[]} now={now} />);

    expect(screen.queryByText(message)).toBeNull();
    expect(screen.getByText('You’re all caught up!')).toBeOnTheScreen();
  });

  it('hides encouragement whenever priority tasks remain', async () => {
    await render(
      <HighPriorityTasks
        tasks={[{ assignment: assignment(), reason: 'dueSoon' }]}
        now={now}
        finishedPriorityWork
      />,
    );

    expect(screen.queryByText(message)).toBeNull();
    expect(screen.getByText('Problem Set')).toBeOnTheScreen();
  });
});