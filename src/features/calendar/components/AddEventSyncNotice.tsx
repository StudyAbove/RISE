import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';

import { styles } from './AddEventSyncNotice.styles';

// Long enough to read a sentence, short enough not to linger.
const VISIBLE_MS = 6000;

interface AddEventSyncNoticeProps {
  message: string;
  onDismiss: () => void;
}

/**
 * Small pill near the bottom of the calendar saying a new event didn't reach a
 * connected Google or Apple calendar (#123). Goes away after a few seconds, or
 * when tapped.
 */
export function AddEventSyncNotice({ message, onDismiss }: AddEventSyncNoticeProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <Pressable
      accessibilityRole="alert"
      accessibilityHint="Tap to dismiss"
      accessibilityLiveRegion="polite"
      onPress={onDismiss}
      style={styles.pill}
    >
      <Text style={styles.message}>{message}</Text>
    </Pressable>
  );
}
