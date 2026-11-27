/**
 * Timing for the guided breathing exercise (#71): the sun rises, then guides
 * five slow breaths (in, hold, out), then settles back behind the hills.
 * Change the pace here; the screen and animation read everything from this file.
 */
export const BREATHING_TIMING = {
  riseMs: 2400,
  inhaleMs: 4000,
  holdMs: 4000,
  exhaleMs: 6000,
  breaths: 5,
  settleMs: 2400,
} as const;

/** How much bigger the sun gets at the top of a breath (1.2 = 20%). */
export const SUN_FULL_BREATH_SCALE = 1.2;

export type BreathPhase = 'in' | 'hold' | 'out';

export type BreathMoment = {
  /** 1 to BREATHING_TIMING.breaths. */
  breath: number;
  phase: BreathPhase;
  /** The sun's size, from 1 (resting) to SUN_FULL_BREATH_SCALE. */
  sunScale: number;
};

const { inhaleMs, holdMs, exhaleMs, breaths } = BREATHING_TIMING;

export const BREATH_MS = inhaleMs + holdMs + exhaleMs;
export const SESSION_MS = BREATH_MS * breaths;

/** Cosine ease-in-out from 0 to 1, so every movement starts and stops gently. */
export function easeInOut(progress: number) {
  const clamped = Math.min(1, Math.max(0, progress));
  return (1 - Math.cos(Math.PI * clamped)) / 2;
}

/** Which breath and phase the session is in, `elapsedMs` after the sun has risen. */
export function getBreathMoment(elapsedMs: number): BreathMoment {
  const clamped = Math.min(Math.max(0, elapsedMs), SESSION_MS - 1);
  const breath = Math.floor(clamped / BREATH_MS) + 1;
  const intoBreath = clamped % BREATH_MS;
  const growth = SUN_FULL_BREATH_SCALE - 1;

  if (intoBreath < inhaleMs) {
    return { breath, phase: 'in', sunScale: 1 + growth * easeInOut(intoBreath / inhaleMs) };
  }

  if (intoBreath < inhaleMs + holdMs) {
    return { breath, phase: 'hold', sunScale: SUN_FULL_BREATH_SCALE };
  }

  const intoExhale = intoBreath - inhaleMs - holdMs;
  return { breath, phase: 'out', sunScale: 1 + growth * (1 - easeInOut(intoExhale / exhaleMs)) };
}
