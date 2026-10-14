import { useCallback, useEffect, useState } from 'react';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { getCalendarEventsInRange } from '../../../repositories/calendarEventsRepository';

export type CalendarEventsStatus = 'loading' | 'ready' | 'error';

/**
 * Loads the events between `rangeStart` and `rangeEnd`, reloading whenever the
 * range changes (switching views or pressing the arrows). While a new range
 * loads, the previous events stay on screen so the grid doesn't flash empty.
 */
export function useCalendarEvents(rangeStart: Date, rangeEnd: Date) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [status, setStatus] = useState<CalendarEventsStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  // Dates are compared by time, not identity, so re-renders with an equal
  // range don't trigger another request.
  const startTime = rangeStart.getTime();
  const endTime = rangeEnd.getTime();

  useEffect(() => {
    // Ignores a slow response that arrives after the student has moved on.
    let isCurrent = true;
    setStatus('loading');

    getCalendarEventsInRange(new Date(startTime), new Date(endTime))
      .then((loadedEvents) => {
        if (isCurrent) {
          setEvents(loadedEvents);
          setStatus('ready');
        }
      })
      .catch((error: Error) => {
        if (isCurrent) {
          console.log('Could not load calendar events:', error.message);
          setStatus('error');
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [startTime, endTime, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return { events, status, retry };
}
