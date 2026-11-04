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

import {
  TaskCompletionModal,
  type TaskCompletionChoice,
} from '../components/TaskCompletionModal';

const mockConfirm = jest.fn<
  (choice: TaskCompletionChoice) => Promise<void>
>();
const mockKeepStudying = jest.fn();

async function renderModal(hasNextTask = true) {
  await render(
    <TaskCompletionModal
      visible
      taskTitle="Organize experimental data"
      hasNextTask={hasNextTask}
      onConfirm={mockConfirm}
      onKeepStudying={mockKeepStudying}
    />,
  );
}

beforeEach(() => {
  mockConfirm.mockReset();
  mockConfirm.mockResolvedValue(undefined);
  mockKeepStudying.mockReset();
});

describe('TaskCompletionModal', () => {
  it('starts unchecked and can move on without completing the task', async () => {
    await renderModal();

    expect(
      screen.getByRole('checkbox').props.accessibilityState.checked,
    ).toBe(false);

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Continue to next task',
      }),
    );

    expect(mockConfirm).toHaveBeenCalledWith({
      completed: false,
      action: 'next',
    });
  });

  it('passes an explicit completion choice before ending the session', async () => {
    await renderModal();

    await fireEvent.press(screen.getByRole('checkbox'));

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'End study session',
      }),
    );

    expect(mockConfirm).toHaveBeenCalledWith({
      completed: true,
      action: 'end',
    });
  });

  it('keeps studying without submitting a completion choice', async () => {
    await renderModal();

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Keep studying this task',
      }),
    );

    expect(mockKeepStudying).toHaveBeenCalledTimes(1);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('preserves the checked choice after failure and lets the student retry', async () => {
    mockConfirm
      .mockRejectedValueOnce(new Error('Connection failed'))
      .mockResolvedValueOnce(undefined);

    await renderModal();

    await fireEvent.press(screen.getByRole('checkbox'));

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Continue to next task',
      }),
    );

    expect(
      await screen.findByText(
        'Couldn’t save task completion. Please try again.',
      ),
    ).toBeTruthy();

    expect(
      screen.getByRole('checkbox').props.accessibilityState.checked,
    ).toBe(true);

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Continue to next task',
      }),
    );

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledTimes(2);
      expect(
        screen.queryByText(
          'Couldn’t save task completion. Please try again.',
        ),
      ).toBeNull();
    });

    expect(mockConfirm).toHaveBeenNthCalledWith(2, {
      completed: true,
      action: 'next',
    });
  });

  it('blocks repeated submission and dismissal while saving', async () => {
    let finishSave!: () => void;

    mockConfirm.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishSave = resolve;
        }),
    );

    await renderModal();

    await fireEvent.press(screen.getByRole('checkbox'));

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Continue to next task',
      }),
    );

    expect(
      screen.getByRole('checkbox').props.accessibilityState.disabled,
    ).toBe(true);

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Continue to next task',
      }),
    );

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'End study session',
      }),
    );

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Keep studying this task',
      }),
    );

    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockKeepStudying).not.toHaveBeenCalled();

    await act(async () => {
      finishSave();
    });

    await waitFor(() => {
      expect(
        screen.getByRole('checkbox').props.accessibilityState.disabled,
      ).toBe(false);
    });
  });

  it('does not offer a next task when the queue is finished', async () => {
    await renderModal(false);

    expect(
      screen.queryByRole('button', {
        name: 'Continue to next task',
      }),
    ).toBeNull();

    expect(
      screen.getByRole('button', {
        name: 'End study session',
      }),
    ).toBeTruthy();
  });
});