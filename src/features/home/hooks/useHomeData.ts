import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addDays, startOfDay } from 'date-fns';

import { supabase } from '../../../lib/supabase';
import {
  fetchAssignments,
  requestAssignmentEstimates,
  type Assignment,
} from '../../../repositories/assignmentsRepository';
import { getCalendarEventsInRange } from '../../../repositories/calendarEventsRepository';
import { getEventMinutesByDay } from '../utils/dailyStudyTime';

export type HomeDataStatus = 'loading' | 'ready' | 'error' | 'signedOut';

// Calendar days to read events for: covers the forecast's week and the
// 14 days High Priority Tasks looks ahead.
const CALENDAR_DAYS_AHEAD = 15;

/** How much of each upcoming day the student's calendar takes up. */
async function loadEventMinutesByDay(): Promise<Map<number, number>> {
  const today = startOfDay(new Date());

  try {
    const events = await getCalendarEventsInRange(today, addDays(today, CALENDAR_DAYS_AHEAD));
    return getEventMinutesByDay(events);
  } catch {
    // The plan still works from assignments alone.
    return new Map();
  }
}

/**
 * Loads what Home's Weekly Forecast and High Priority Tasks are built from:
 * the student's assignments and how busy their calendar is (#67).
 *
 * Reloads whenever Home is opened and when the app comes back to the
 * foreground on Home, so added, finished, or moved assignments and calendar
 * changes show up. Then asks for time estimates on any assignment without
 * one and reloads with them; RISE's own guesses show until they arrive.
 *
 * `signedOut` hides those sections, e.g. when skipping login in development.
 */
export function useHomeData() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [eventMinutesByDay, setEventMinutesByDay] = useState<Map<number, number>>(new Map());
  const [status, setStatus] = useState<HomeDataStatus>('loading');

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

          const [loaded, eventMinutes] = await Promise.all([
            fetchAssignments(),
            loadEventMinutesByDay(),
          ]);

          if (!active) return;

          setAssignments(loaded);
          setEventMinutesByDay(eventMinutes);
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

      // Coming back to the app on Home, e.g. after syncing Canvas elsewhere.
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') void load();
      });

      // Ignore results that arrive after the student leaves Home.
      return () => {
        active = false;
        subscription.remove();
      };
    }, []),
  );

  return { status, assignments, eventMinutesByDay };
}
