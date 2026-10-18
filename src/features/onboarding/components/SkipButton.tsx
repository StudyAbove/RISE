import { Pressable, Text } from 'react-native';

import { styles } from './SkipButton.styles';

type SkipButtonProps = {
  onPress: () => void;
};

/** Lets the student skip an optional onboarding step and set it up later in Settings. */
export function SkipButton({ onPress }: SkipButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Skip"
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>Skip</Text>
    </Pressable>
  );
}
