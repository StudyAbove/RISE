import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors } from '../../../theme/colors';
import type { CalendarEventsStatus as Status } from '../hooks/useCalendarEvents';
import { styles } from './CalendarEventsStatus.styles';

// Most loads finish before this, so the spinner doesn't flash on every arrow tap.
const SPINNER_DELAY_MS = 300;

interface CalendarEventsStatusProps {
  status: Status;
  onRetry: () => void;
}

/**
 * Floating pill over the bottom of the calendar that shows slow loading and
 * load errors without moving the grid. Shows nothing once events are loaded,
 * including when there are none (an empty calendar needs no message).
 */
export function CalendarEventsStatus({ status, onRetry }: CalendarEventsStatusProps) {
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    if (status !== 'loading') {
      setShowSpinner(false);
      return;
    }
    const timer = setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status]);

  if (status === 'error') {
    return (
      <View style={styles.pill} accessibilityLiveRegion="polite">
        <Text style={styles.message}>Couldn't load events.</Text>
        <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={12}>
          <Text style={styles.retry}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (status === 'loading' && showSpinner) {
    return (
      <View style={styles.pill}>
        <ActivityIndicator size="small" color={colors.eucalyptus} accessibilityLabel="Loading events" />
      </View>
    );
  }

  return null;
}
