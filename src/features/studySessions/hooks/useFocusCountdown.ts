import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

type Options = {
  taskId: string;
  durationSeconds: number;
  running: boolean;
};

/**
 * Count down one task using elapsed clock time.
 * Pausing preserves the remaining time; a different task starts fresh.
 * Reaching zero never marks a task complete.
 */
export function useFocusCountdown({
  taskId,
  durationSeconds,
  running,
}: Options) {
  const safeDuration =
    Number.isInteger(durationSeconds) &&
    durationSeconds > 0 &&
    durationSeconds <= 6000 * 60
      ? durationSeconds
      : 0;

  const remainingMsRef = useRef(safeDuration * 1000);
  const previousTaskRef = useRef({
    taskId,
    duration: safeDuration,
  });

  const [remainingSeconds, setRemainingSeconds] = useState(safeDuration);

  useEffect(() => {
    const previousTask = previousTaskRef.current;

    // Only a different task or changed duration resets the countdown.
    if (
      previousTask.taskId !== taskId ||
      previousTask.duration !== safeDuration
    ) {
      remainingMsRef.current = safeDuration * 1000;
      previousTaskRef.current = {
        taskId,
        duration: safeDuration,
      };
    }

    setRemainingSeconds(Math.ceil(remainingMsRef.current / 1000));

    if (!running || remainingMsRef.current <= 0) {
      return;
    }

    // A deadline avoids counting slowly when interval callbacks are delayed.
    const deadline = Date.now() + remainingMsRef.current;
    let interval: ReturnType<typeof setInterval> | undefined;

    function updateRemainingTime() {
      const remainingMs = Math.max(0, deadline - Date.now());

      remainingMsRef.current = remainingMs;
      setRemainingSeconds(Math.ceil(remainingMs / 1000));

      if (remainingMs === 0 && interval !== undefined) {
        clearInterval(interval);
        interval = undefined;
      }
    }

    interval = setInterval(updateRemainingTime, 250);

    // Refresh immediately when returning from the phone's background state.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        updateRemainingTime();
      }
    });

    return () => {
      if (interval !== undefined) {
        clearInterval(interval);
      }

      subscription.remove();

      // Preserve fractions of a second when pausing or leaving Focus.
      remainingMsRef.current = Math.max(0, deadline - Date.now());
    };
  }, [taskId, safeDuration, running]);

  return {
    remainingSeconds,
    hasEnded: remainingSeconds === 0,
  };
}