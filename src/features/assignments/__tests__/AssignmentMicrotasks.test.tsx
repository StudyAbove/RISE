import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import {
  fetchMicrotasks,
  requestMicrotaskGeneration,
  setMicrotaskCompleted,
  type Microtask,
} from '../../../repositories/microtasksRepository';
import { AssignmentMicrotasks } from '../components/AssignmentMicrotasks';

// These tests use sample responses, not real accounts or AI requests.
jest.mock('../../../repositories/microtasksRepository', () => ({
  fetchMicrotasks: jest.fn(),
  setMicrotaskCompleted: jest.fn(),
  requestMicrotaskGeneration: jest.fn(),
  MicrotaskGenerationError: class extends Error {},
}));

const mockFetch = jest.mocked(fetchMicrotasks);
const mockGenerate = jest.mocked(requestMicrotaskGeneration);
const mockSetCompleted = jest.mocked(setMicrotaskCompleted);

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
    mockSetCompleted.mockReset();
  mockSetCompleted.mockResolvedValue(false);

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
describe('AssignmentMicrotasks selection and undo', () => {
  it('selects and deselects without completing a task or changing progress', async () => {
    const task = savedTask();
    const onSelectionChange = jest.fn();

    mockFetch.mockResolvedValue([task]);

    await render(
      <AssignmentMicrotasks
        assignment={assignment}
        onSelectionChange={onSelectionChange}
      />,
    );

    const card = await screen.findByRole('button', {
      name: /Step 1\. Organize experimental data/,
    });

    await fireEvent.press(card);

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenLastCalledWith([task]);
    });

    expect(
      screen.getByRole('button', {
        name: /Step 1\. Organize experimental data/,
      }).props.accessibilityState.selected,
    ).toBe(true);

    expect(screen.getByText('0 / 1 tasks')).toBeTruthy();
    expect(mockSetCompleted).not.toHaveBeenCalled();

    await fireEvent.press(
      screen.getByRole('button', {
        name: /Step 1\. Organize experimental data/,
      }),
    );

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    });

    expect(
      screen.getByRole('button', {
        name: /Step 1\. Organize experimental data/,
      }).props.accessibilityState.selected,
    ).toBe(false);

    expect(mockSetCompleted).not.toHaveBeenCalled();
  });

  it('reports multiple selected tasks in their saved order', async () => {
    const first = savedTask();
    const second = savedTask({
      id: 'task-2',
      title: 'Write the conclusion',
      position: 2,
      estimatedMinutes: 65,
    });
    const onSelectionChange = jest.fn();

    mockFetch.mockResolvedValue([first, second]);

    await render(
      <AssignmentMicrotasks
        assignment={assignment}
        onSelectionChange={onSelectionChange}
      />,
    );

    // Select the second task first to verify saved order is preserved.
    await fireEvent.press(
      await screen.findByRole('button', {
        name: /Step 2\. Write the conclusion/,
      }),
    );

    await fireEvent.press(
      screen.getByRole('button', {
        name: /Step 1\. Organize experimental data/,
      }),
    );

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenLastCalledWith([
        first,
        second,
      ]);
    });

    expect(screen.getByText('0 / 2 tasks')).toBeTruthy();
    expect(mockSetCompleted).not.toHaveBeenCalled();
  });

  it('undoes completion after saving and leaves the task unselected', async () => {
    mockFetch.mockResolvedValue([
      savedTask({ completed: true }),
    ]);
    const onSelectionChange = jest.fn();

    await render(
      <AssignmentMicrotasks
        assignment={assignment}
        onSelectionChange={onSelectionChange}
      />,
    );

    expect(await screen.findByText('1 / 1 tasks')).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', {
        name: /Step 1\. Organize experimental data/,
      }),
    );

    expect(mockSetCompleted).toHaveBeenCalledWith(
      assignment.id,
      'task-1',
      false,
    );

    expect(await screen.findByText('0 / 1 tasks')).toBeTruthy();

    expect(
      screen.getByRole('button', {
        name: /Step 1\. Organize experimental data/,
      }).props.accessibilityState.selected,
    ).toBe(false);

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    });
  });

  it('keeps completion and progress unchanged when undo fails, then allows retry', async () => {
    mockFetch.mockResolvedValue([
      savedTask({ completed: true }),
    ]);

    mockSetCompleted
      .mockRejectedValueOnce(new Error('Connection failed'))
      .mockResolvedValueOnce(false);

    await render(<AssignmentMicrotasks assignment={assignment} />);

    await fireEvent.press(
      await screen.findByRole('button', {
        name: /Step 1\. Organize experimental data/,
      }),
    );

    expect(
      await screen.findByText(
        'Couldn’t undo completion. Please try again.',
      ),
    ).toBeTruthy();

    expect(screen.getByText('1 / 1 tasks')).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', {
        name: /Step 1\. Organize experimental data/,
      }),
    );

    expect(await screen.findByText('0 / 1 tasks')).toBeTruthy();
    expect(mockSetCompleted).toHaveBeenCalledTimes(2);

    expect(
      screen.queryByText(
        'Couldn’t undo completion. Please try again.',
      ),
    ).toBeNull();
  });

  it('waits for an undo save before changing progress and blocks repeated taps', async () => {
    let finishSave!: (completed: boolean) => void;

    mockSetCompleted.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finishSave = resolve;
        }),
    );

    mockFetch.mockResolvedValue([
      savedTask({ completed: true }),
    ]);

    await render(<AssignmentMicrotasks assignment={assignment} />);

    await fireEvent.press(
      await screen.findByRole('button', {
        name: /Step 1\. Organize experimental data/,
      }),
    );

    expect(screen.getByText('1 / 1 tasks')).toBeTruthy();

    expect(
      screen.getByRole('button', {
        name: /Step 1\. Organize experimental data/,
      }).props.accessibilityState.busy,
    ).toBe(true);

    await fireEvent.press(
      screen.getByRole('button', {
        name: /Step 1\. Organize experimental data/,
      }),
    );

    expect(mockSetCompleted).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishSave(false);
    });

    expect(await screen.findByText('0 / 1 tasks')).toBeTruthy();
  });

  it('restores the saved completion state after reopening', async () => {
    mockFetch
      .mockResolvedValueOnce([savedTask({ completed: true })])
      .mockResolvedValueOnce([savedTask({ completed: false })]);

    const firstScreen = await render(
      <AssignmentMicrotasks assignment={assignment} />,
    );

    await fireEvent.press(
      await screen.findByRole('button', {
        name: /Step 1\. Organize experimental data/,
      }),
    );

    expect(await screen.findByText('0 / 1 tasks')).toBeTruthy();

    await firstScreen.unmount();

    await render(<AssignmentMicrotasks assignment={assignment} />);

    expect(await screen.findByText('0 / 1 tasks')).toBeTruthy();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});