import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState } from 'react-native';

import {
  BREATHING_TIMING,
  easeInOut,
  getBreathMoment,
  SESSION_MS,
  type BreathPhase,
} from '../utils/breathingSession';

export type BreathingStatus = 'ready' | 'rising' | 'running' | 'paused' | 'settling' | 'done';

type CurrentBreath = { breath: number; phase: BreathPhase };

const FIRST_BREATH: CurrentBreath = { breath: 1, phase: 'in' };

/**
 * Runs the guided breathing session (#71).
 *
 * The sun's movement is driven by two Animated values that the scene reads:
 * `sunRise` (0 resting behind the hills, 1 fully risen) and `sunScale`
 * (1 resting, bigger at the top of a breath). They're updated every frame from
 * the clock, so pausing and resuming picks up exactly where the breath was.
 */
export function useBreathingSession() {
  const sunRise = useRef(new Animated.Value(0)).current;
  const sunScale = useRef(new Animated.Value(1)).current;

  const [status, setStatusState] = useState<BreathingStatus>('ready');
  const [currentBreath, setCurrentBreath] = useState<CurrentBreath>(FIRST_BREATH);

  // Refs, so the frame loop and the AppState listener always see the latest values.
  const statusRef = useRef<BreathingStatus>('ready');
  const frameRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const sunRef = useRef({ rise: 0, scale: 1 });

  const setStatus = useCallback((next: BreathingStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const moveSun = useCallback(
    (rise: number, scale: number) => {
      sunRef.current = { rise, scale };
      sunRise.setValue(rise);
      sunScale.setValue(scale);
    },
    [sunRise, sunScale],
  );

  const stopFrames = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  // Calls `step` every frame until it returns false. Only one loop ever runs:
  // starting a new one (even from inside `step`) cancels the old one.
  const runFrames = useCallback(
    (step: () => boolean) => {
      stopFrames();

      const tick = () => {
        frameRef.current = null;
        if (step()) frameRef.current = requestAnimationFrame(tick);
      };

      frameRef.current = requestAnimationFrame(tick);
    },
    [stopFrames],
  );

  /** Eases the sun back to its resting spot, from wherever it is now. */
  const settle = useCallback(() => {
    const from = sunRef.current;
    const startedAt = Date.now();
    setStatus('settling');

    runFrames(() => {
      const progress = easeInOut((Date.now() - startedAt) / BREATHING_TIMING.settleMs);
      moveSun(from.rise * (1 - progress), from.scale + (1 - from.scale) * progress);

      if (progress < 1) return true;
      setStatus('done');
      return false;
    });
  }, [moveSun, runFrames, setStatus]);

  const breathe = useCallback(() => {
    const startedAt = Date.now() - elapsedRef.current;
    setStatus('running');

    runFrames(() => {
      const elapsed = Date.now() - startedAt;
      elapsedRef.current = elapsed;

      if (elapsed >= SESSION_MS) {
        settle();
        return false;
      }

      const moment = getBreathMoment(elapsed);
      moveSun(1, moment.sunScale);
      // Only re-render when the words on screen change, not every frame.
      setCurrentBreath((current) =>
        current.breath === moment.breath && current.phase === moment.phase
          ? current
          : { breath: moment.breath, phase: moment.phase },
      );
      return true;
    });
  }, [moveSun, runFrames, setStatus, settle]);

  const begin = useCallback(() => {
    const startedAt = Date.now();
    elapsedRef.current = 0;
    setCurrentBreath(FIRST_BREATH);
    setStatus('rising');

    runFrames(() => {
      const progress = easeInOut((Date.now() - startedAt) / BREATHING_TIMING.riseMs);
      moveSun(progress, 1);

      if (progress < 1) return true;
      breathe();
      return false;
    });
  }, [breathe, moveSun, runFrames, setStatus]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'running') return;
    stopFrames();
    setStatus('paused');
  }, [setStatus, stopFrames]);

  const resume = useCallback(() => {
    if (statusRef.current === 'paused') breathe();
  }, [breathe]);

  /** Ends early. The sun always settles back instead of disappearing. */
  const finish = useCallback(() => {
    if (['rising', 'running', 'paused'].includes(statusRef.current)) settle();
  }, [settle]);

  // Pause when the app goes to the background, so no breaths are missed.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') pause();
    });

    return () => subscription.remove();
  }, [pause]);

  useEffect(() => stopFrames, [stopFrames]);

  return { status, ...currentBreath, sunRise, sunScale, begin, pause, resume, finish };
}
