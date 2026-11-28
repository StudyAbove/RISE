import { useCallback, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../../../lib/supabase';
import {
  fetchAssignments,
  type Assignment,
} from '../../../repositories/assignmentsRepository';
import { getBadges, type Badge } from '../utils/badges';
import { calculateStreak, type StreakSummary } from '../utils/streak';

export type StreakDataStatus = 'loading' | 'ready' | 'error' | 'signedOut';

/**
 * Loads the student's assignments and works out their streak (#7).
 *
 * Reloads whenever the Streak page is opened and when the app comes back to
 * the foreground on it, so newly finished or synced assignments show up.
 *
 * `streak` and `badges` (#9) are null until the assignments have loaded. `reload` tries again
 * after an error.
 */
export function useStreakData(now: Date) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [status, setStatus] = useState<StreakDataStatus>('loading');
  const [reloadCount, setReloadCount] = useState(0);

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
        } catch {
          if (active) setStatus('error');
        }
      }

      void load();

      // Coming back to the app on the Streak page, e.g. after syncing Canvas.
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') void load();
      });

      // Ignore results that arrive after the student leaves the page.
      return () => {
        active = false;
        subscription.remove();
      };
    }, [reloadCount]),
  );

  const streak = useMemo<StreakSummary | null>(
    () => (status === 'ready' ? calculateStreak(assignments, now) : null),
    [assignments, now, status],
  );

  const badges = useMemo<Badge[] | null>(
    () => (status === 'ready' ? getBadges(assignments, now) : null),
    [assignments, now, status],
  );

  // Tries loading again, e.g. from "Try again" after an error.
  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { status, streak, badges, reload };
}
