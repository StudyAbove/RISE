import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { onboardingColors } from '../../../theme/colors';
import { styles } from './OnboardingButton.styles';

type OnboardingButtonProps = {
  label: string;
  onPress: () => void;
  trailingIcon?: ReactNode;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Wide yellow pill button, e.g. "Copy the Link" and "Show me my week". */
export function OnboardingButton({
  label,
  onPress,
  trailingIcon,
  isLoading = false,
  style,
}: OnboardingButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: isLoading }}
      onPress={onPress}
      disabled={isLoading}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={onboardingColors.heading} />
      ) : (
        <>
          <Text style={styles.label}>{label}</Text>
          {trailingIcon}
        </>
      )}
    </Pressable>
  );
}
