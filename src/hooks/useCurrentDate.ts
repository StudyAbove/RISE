import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Today's date and time, refreshed whenever the app comes back to the
 * foreground. Screens stay mounted in the background, so without this a
 * greeting shown last night would still say "Good evening" the next morning.
 *
 * Also refreshes every minute so due-date styling stays current while open.
 */
export function useCurrentDate(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Refresh the current time every minute.
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60_000);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNow(new Date());
      }
    });

    // Remove the timer and listener when the hook unmounts.
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return now;
}