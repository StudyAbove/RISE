import {
  BREATH_MS,
  BREATHING_TIMING,
  easeInOut,
  getBreathMoment,
  SESSION_MS,
  SUN_FULL_BREATH_SCALE,
} from '../breathingSession';

const { inhaleMs, holdMs, exhaleMs } = BREATHING_TIMING;

describe('breathing session timing (#71)', () => {
  it('lasts five breaths of in 4s, hold 4s, out 6s', () => {
    expect(BREATH_MS).toBe(14_000);
    expect(SESSION_MS).toBe(70_000);
  });

  it('eases gently from 0 to 1', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(2)).toBe(1);
  });

  it('grows the sun while breathing in', () => {
    expect(getBreathMoment(0)).toEqual({ breath: 1, phase: 'in', sunScale: 1 });
    expect(getBreathMoment(inhaleMs / 2).sunScale).toBeCloseTo(1.1);
  });

  it('keeps the sun full while holding', () => {
    expect(getBreathMoment(inhaleMs)).toEqual({ breath: 1, phase: 'hold', sunScale: SUN_FULL_BREATH_SCALE });
    expect(getBreathMoment(inhaleMs + holdMs - 1).phase).toBe('hold');
  });

  it('shrinks the sun while breathing out', () => {
    const exhaleStart = inhaleMs + holdMs;

    expect(getBreathMoment(exhaleStart)).toMatchObject({ phase: 'out', sunScale: SUN_FULL_BREATH_SCALE });
    expect(getBreathMoment(exhaleStart + exhaleMs / 2).sunScale).toBeCloseTo(1.1);
    expect(getBreathMoment(BREATH_MS - 1).sunScale).toBeCloseTo(1);
  });

  it('counts the breaths, ending on the fifth', () => {
    expect(getBreathMoment(BREATH_MS).breath).toBe(2);
    expect(getBreathMoment(SESSION_MS - 1)).toMatchObject({ breath: 5, phase: 'out' });
    expect(getBreathMoment(SESSION_MS + 5000).breath).toBe(5);
  });
});
