import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../../../lib/supabase';
import {
  fetchAssignments,
  requestAssignmentEstimates,
  type Assignment,
} from '../../../repositories/assignmentsRepository';
import type { WeeklyForecastStatus } from '../components/WeeklyForecastCard';
import { buildWeeklyForecast } from '../utils/weeklyForecast';

/**
 * Loads the student's assignments for the Weekly Forecast card, then asks for
 * time estimates on any that don't have one and reloads with them. RISE's own
 * guesses show until the estimates arrive, or if they can't be made.
 *
 * `signedOut` hides the card, e.g. when skipping login in development.
 */
export function useWeeklyForecast(now: Date) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [status, setStatus] = useState<WeeklyForecastStatus | 'signedOut'>('loading');

  // Reload whenever the student comes back to Home.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          const { data, error } = await supabase.auth.getSession();

          if (!active) return;
          if (error) throw error;

          if (!data.session) {
            setStatus('signedOut');
            return;
          }

          const loaded = await fetchAssignments();

          if (!active) return;

          setAssignments(loaded);
          setStatus('ready');

          const needsEstimate = loaded.some(
            (assignment) => !assignment.completed && assignment.estimatedMinutes === null,
          );

          if (!needsEstimate) return;

          try {
            const estimated = await requestAssignmentEstimates();

            if (!active || estimated === 0) return;

            const reloaded = await fetchAssignments();

            if (active) setAssignments(reloaded);
          } catch {
            // Keep showing RISE's guesses; the next visit tries again.
          }
        } catch {
          if (active) setStatus('error');
        }
      }

      void load();

      // Ignore results that arrive after the student leaves Home.
      return () => {
        active = false;
      };
    }, []),
  );

  const forecast = useMemo(
    () => (status === 'ready' ? buildWeeklyForecast(assignments, now) : null),
    [assignments, now, status],
  );

  return { status, forecast };
}
