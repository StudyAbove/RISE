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
const mockNeedMoreTime = jest.fn();

async function renderModal(
  hasNextTask = true,
  timeExpired = false,
) {
  await render(
    <TaskCompletionModal
      visible
      taskTitle="Organize experimental data"
      hasNextTask={hasNextTask}
      timeExpired={timeExpired}
      onConfirm={mockConfirm}
      onNeedMoreTime={mockNeedMoreTime}
    />,
  );
}

beforeEach(() => {
  mockConfirm.mockReset();
  mockConfirm.mockResolvedValue(undefined);
  mockNeedMoreTime.mockReset();
});

describe('TaskCompletionModal', () => {
  it('starts unchecked and can move on without completing the task', async () => {
    await renderModal();

    expect(
      screen.getByRole('checkbox').props.accessibilityState.checked,
    ).toBe(false);

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Continue To Next Task',
      }),
    );

    expect(mockConfirm).toHaveBeenCalledWith({
      completed: false,
      action: 'next',
    });
  });

  it('passes an explicit completion choice before finishing the session', async () => {
    await renderModal(false);

    await fireEvent.press(screen.getByRole('checkbox'));

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Finish Study Session',
      }),
    );

    expect(mockConfirm).toHaveBeenCalledWith({
      completed: true,
      action: 'end',
    });
  });

  it('only toggles completion from the circle, not the sentence', async () => {
    await renderModal();

    expect(
      screen.getByRole('checkbox').props.accessibilityState.checked,
    ).toBe(false);

    await fireEvent.press(
      screen.getByText('Yes, mark this task complete'),
    );

    expect(
      screen.getByRole('checkbox').props.accessibilityState.checked,
    ).toBe(false);

    await fireEvent.press(
      screen.getByRole('checkbox'),
    );

    expect(
      screen.getByRole('checkbox').props.accessibilityState.checked,
    ).toBe(true);
  });

  it('keeps studying without submitting a completion choice', async () => {
    await renderModal();

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Keep Studying',
      }),
    );

    expect(mockNeedMoreTime).toHaveBeenCalledTimes(1);
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
        name: 'Continue To Next Task',
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
        name: 'Continue To Next Task',
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
        name: 'Continue To Next Task',
      }),
    );

    expect(
      screen.getByRole('checkbox').props.accessibilityState.disabled,
    ).toBe(true);

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Continue To Next Task',
      }),
    );

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Keep Studying',
      }),
    );

    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockNeedMoreTime).not.toHaveBeenCalled();

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
        name: 'Continue To Next Task',
      }),
    ).toBeNull();

    expect(
      screen.getByRole('button', {
        name: 'Finish Study Session',
      }),
    ).toBeTruthy();
  });

  it('shows I Need More Time when time has expired', async () => {
    await renderModal(true, true);

    expect(
      screen.getByRole('button', {
        name: 'I Need More Time',
      }),
    ).toBeTruthy();

    expect(
      screen.queryByRole('button', {
        name: 'Keep Studying',
      }),
    ).toBeNull();
  });

});