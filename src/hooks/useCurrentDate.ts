import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Today's date and time, refreshed whenever the app comes back to the
 * foreground. Screens stay mounted in the background, so without this a
 * greeting shown last night would still say "Good evening" the next morning.
 */
export function useCurrentDate(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNow(new Date());
      }
    });

    return () => subscription.remove();
  }, []);

  return now;
}
