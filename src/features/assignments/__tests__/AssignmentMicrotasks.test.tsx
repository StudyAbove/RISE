import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import {
  fetchMicrotasks,
  requestMicrotaskGeneration,
  type Microtask,
} from '../../../repositories/microtasksRepository';
import { AssignmentMicrotasks } from '../components/AssignmentMicrotasks';

// These tests use sample responses, not real accounts or AI requests.
jest.mock('../../../repositories/microtasksRepository', () => ({
  fetchMicrotasks: jest.fn(),
  requestMicrotaskGeneration: jest.fn(),
  MicrotaskGenerationError: class extends Error {},
}));

const mockFetch = jest.mocked(fetchMicrotasks);
const mockGenerate = jest.mocked(requestMicrotaskGeneration);

const assignment: Assignment = {
  id: 'assignment-1',
  title: 'Osmosis Lab Report',
  description: 'Write up experimental results and a conclusion.',
  dueAt: new Date('2026-11-13T23:59:00Z'),
  completed: false,
  source: 'canvas',
  courseName: 'Cell Biology',
  courseCode: 'BIO 200',
  courseColor: '#A8BEA3',
  courseTint: '#EAF0E8',
  pointsPossible: 50,
  htmlUrl: null,
  estimatedMinutes: 80,
  kind: 'lab',
};

function savedTask(
  overrides: Partial<Microtask> = {},
): Microtask {
  return {
    id: 'task-1',
    assignmentId: assignment.id,
    title: 'Organize experimental data',
    position: 1,
    estimatedMinutes: 15,
    completed: false,
    sourceBasis: 'test-basis',
    planTotalMinutes: 80,
    ...overrides,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  mockGenerate.mockReset();

  mockFetch.mockResolvedValue([]);
  mockGenerate.mockResolvedValue({
    status: 'ready',
    created: false,
  });
});

describe('AssignmentMicrotasks', () => {
  it('displays saved task titles, estimates, and progress', async () => {
    mockFetch.mockResolvedValue([
      savedTask(),
      savedTask({
        id: 'task-2',
        title: 'Write the conclusion',
        position: 2,
        estimatedMinutes: 65,
        completed: true,
      }),
    ]);

    await render(<AssignmentMicrotasks assignment={assignment} />);

    expect(
      await screen.findByText('Organize experimental data'),
    ).toBeTruthy();

    expect(screen.getByText('Write the conclusion')).toBeTruthy();
    expect(screen.getByText('Est. 15m')).toBeTruthy();
    expect(screen.getByText('1 / 2 tasks')).toBeTruthy();

    expect(
      screen.getByRole('progressbar').props.accessibilityValue,
    ).toMatchObject({
      min: 0,
      max: 2,
      now: 1,
    });

    expect(mockFetch).toHaveBeenCalledWith(assignment.id);
  });

  it('shows the empty state without automatically requesting generation', async () => {
    await render(<AssignmentMicrotasks assignment={assignment} />);

    expect(
      await screen.findByText('No microtasks available yet.'),
    ).toBeTruthy();

    expect(
      screen.getByRole('button', { name: 'Create microtasks' }),
    ).toBeTruthy();

    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('generates tasks after the student requests them and reads saved results', async () => {
    mockFetch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([savedTask({ estimatedMinutes: 80 })]);

    mockGenerate.mockResolvedValue({
      status: 'ready',
      created: true,
    });

    await render(<AssignmentMicrotasks assignment={assignment} />);

    const button = await screen.findByRole('button', {
      name: 'Create microtasks',
    });

    await fireEvent.press(button);

    expect(
      await screen.findByText('Organize experimental data'),
    ).toBeTruthy();

    expect(mockGenerate).toHaveBeenCalledWith(assignment.id);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(screen.getByText('0 / 1 tasks')).toBeTruthy();
  });

  it('does not offer generation without a saved assignment estimate', async () => {
    await render(
      <AssignmentMicrotasks
        assignment={{ ...assignment, estimatedMinutes: null }}
      />,
    );

    expect(
      await screen.findByText('No microtasks available yet.'),
    ).toBeTruthy();

    expect(
      screen.queryByRole('button', { name: 'Create microtasks' }),
    ).toBeNull();

    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('lets the student retry a failed task load', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Connection failed'))
      .mockResolvedValueOnce([]);

    await render(<AssignmentMicrotasks assignment={assignment} />);

    expect(
      await screen.findByText('Couldn’t load microtasks.'),
    ).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Try again' }),
    );

    expect(
      await screen.findByText('No microtasks available yet.'),
    ).toBeTruthy();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('keeps the empty state when assignment information is insufficient', async () => {
    mockGenerate.mockResolvedValue({
      status: 'insufficient_information',
      created: false,
    });

    await render(<AssignmentMicrotasks assignment={assignment} />);

    await fireEvent.press(
      await screen.findByRole('button', {
        name: 'Create microtasks',
      }),
    );

    expect(
      await screen.findByText(
        'There isn’t enough assignment information to create useful steps yet.',
      ),
    ).toBeTruthy();

    expect(
      screen.getByText('No microtasks available yet.'),
    ).toBeTruthy();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('warns about an outdated plan while preserving its saved tasks', async () => {
    mockFetch.mockResolvedValue([savedTask()]);

    mockGenerate.mockResolvedValue({
      status: 'outdated',
      created: false,
    });

    await render(<AssignmentMicrotasks assignment={assignment} />);

    expect(
      await screen.findByText(
        'This assignment has changed since these tasks were created. ' +
        'Your saved tasks have been kept.',
      ),
    ).toBeTruthy();

    expect(
      screen.getByText('Organize experimental data'),
    ).toBeTruthy();

    expect(screen.getByText('0 / 1 tasks')).toBeTruthy();
  });
});