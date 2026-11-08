import {
  act,
  cleanup,
  renderHook,
} from '@testing-library/react-native';

import { useFocusCountdown } from '../hooks/useFocusCountdown';

type CountdownProps = {
  taskId: string;
  durationSeconds: number;
  running: boolean;
};

function startCountdown(overrides: Partial<CountdownProps> = {}) {
  return renderHook(
    (props: CountdownProps) => useFocusCountdown(props),
    {
      initialProps: {
        taskId: 'task-a',
        durationSeconds: 60,
        running: true,
        ...overrides,
      },
    },
  );
}

async function advanceTime(milliseconds: number) {
  await act(async () => {
    jest.advanceTimersByTime(milliseconds);
  });
}

describe('useFocusCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-03T12:00:00Z'));
  });

  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
  });

  it('starts with the selected task duration and counts down', async () => {
    const { result } = await startCountdown();

    expect(result.current.remainingSeconds).toBe(60);
    expect(result.current.hasEnded).toBe(false);

    await advanceTime(5000);

    expect(result.current.remainingSeconds).toBe(55);
  });

  it('preserves remaining time while paused and resumes from it', async () => {
    const { result, rerender } = await startCountdown();

    await advanceTime(5000);

    await rerender({
      taskId: 'task-a',
      durationSeconds: 60,
      running: false,
    });

    await advanceTime(30000);

    expect(result.current.remainingSeconds).toBe(55);

    await rerender({
      taskId: 'task-a',
      durationSeconds: 60,
      running: true,
    });

    await advanceTime(5000);

    expect(result.current.remainingSeconds).toBe(50);
  });

  it('preserves fractions of a second across a pause', async () => {
    const { result, rerender } = await startCountdown();

    await advanceTime(1500);

    await rerender({
      taskId: 'task-a',
      durationSeconds: 60,
      running: false,
    });

    expect(result.current.remainingSeconds).toBe(59);

    await advanceTime(10000);

    await rerender({
      taskId: 'task-a',
      durationSeconds: 60,
      running: true,
    });

    await advanceTime(500);

    expect(result.current.remainingSeconds).toBe(58);
  });

  it('starts a different task with its own full duration', async () => {
    const { result, rerender } = await startCountdown();

    await advanceTime(10000);

    await rerender({
      taskId: 'task-b',
      durationSeconds: 120,
      running: true,
    });

    expect(result.current.remainingSeconds).toBe(120);

    await advanceTime(5000);

    expect(result.current.remainingSeconds).toBe(115);
  });

  it('does not reset when the same task is rendered again', async () => {
    const { result, rerender } = await startCountdown();

    await advanceTime(10000);

    await rerender({
      taskId: 'task-a',
      durationSeconds: 60,
      running: true,
    });

    expect(result.current.remainingSeconds).toBe(50);
  });

  it('stops at zero and never becomes negative', async () => {
    const { result } = await startCountdown({
      durationSeconds: 2,
    });

    await advanceTime(2000);

    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.hasEnded).toBe(true);

    await advanceTime(10000);

    expect(result.current.remainingSeconds).toBe(0);
  });

  it('uses elapsed clock time when an update is delayed', async () => {
    const { result } = await startCountdown();

    // Move the clock forward without running interval callbacks.
    jest.setSystemTime(new Date('2026-11-03T12:00:20Z'));

    await advanceTime(250);

    expect(result.current.remainingSeconds).toBe(40);
  });

  it('does not start counting while paused', async () => {
    const { result } = await startCountdown({
      running: false,
    });

    await advanceTime(10000);

    expect(result.current.remainingSeconds).toBe(60);
  });

  it.each([0, -1, 1.5, NaN, Infinity, 360001])(
    'rejects an invalid duration: %s',
    async (durationSeconds) => {
      const { result } = await startCountdown({ durationSeconds });

      expect(result.current.remainingSeconds).toBe(0);
      expect(result.current.hasEnded).toBe(true);
    },
  );
});