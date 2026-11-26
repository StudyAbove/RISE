import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import StreakFireIcon from '../../../../assets/icons/streak-fire.svg';

import { styles } from './StreakIndicator.styles';

interface StreakIndicatorProps {
  count?: number | null;
}

/**
 * Displays the current academic streak on Home (#66)
 * and opens the Streak details page (#7).
 */
export function StreakIndicator({
  count = null,
}: StreakIndicatorProps) {
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Streak"
      accessibilityValue={{
        text:
          count === null
            ? 'Unavailable'
            : `${count} ${count === 1 ? 'day' : 'days'}`,
      }}
      accessibilityHint="Opens your streak details"
      onPress={() => navigation.navigate('Streak')}
      style={({ pressed }) => [
        styles.touchTarget,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.pill}>
        <StreakFireIcon
          width={29}
          height={29}
        />

        <Text style={styles.count}>
          {count === null ? '—' : count}
        </Text>
      </View>
    </Pressable>
  );
}
