import { Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { styles } from './StreakIndicator.styles';

/**
 * Streak pill in the top-right of Home that opens the Streak page (#7).
 *
 * TODO(#66): Placeholder for the streak counter story. Show the current
 * streak count (calculateStreak in ../utils/streak), refresh it when it
 * changes, and match the Figma pill and flame icon.
 */
export function StreakIndicator() {
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Streak"
      onPress={() => navigation.navigate('Streak')}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <Text style={styles.flame}>🔥</Text>
    </Pressable>
  );
}
