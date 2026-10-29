import {
  BREAK_CATALOG,
} from '../data/breakTypes';

import type {
  BreakType,
} from '../types';

/**
 * Returns the break choices displayed on the Take a Break screen.
 *
 * Issue #12 currently has three available break types, so all three
 * are returned. Later this function can select three recommendations
 * from a larger catalog using randomness, previous break history,
 * analytics, mood, study duration, or another recommendation rule.
 *
 * Keeping this decision outside the screen means the screen layout
 * does not need to change when more break types are added.
 */
export function getRecommendedBreaks(
  count = 3,
): BreakType[] {
  return BREAK_CATALOG.slice(
    0,
    count,
  );
}
