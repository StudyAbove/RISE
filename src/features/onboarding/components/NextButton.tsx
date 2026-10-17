import {
  ActivityIndicator,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import ArrowLeftIcon from '../../../../assets/icons/arrow-left.svg';
import { colors } from '../../../theme/colors';
import { styles } from './NextButton.styles';

const ICON_SIZE = 24;

type NextButtonProps = {
  accessibilityLabel: string;
  onPress: () => void;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Round yellow arrow button that moves the student forward in onboarding. */
export function NextButton({
  accessibilityLabel,
  onPress,
  isLoading = false,
  style,
}: NextButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
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
        <ActivityIndicator color={colors.deepOlive} />
      ) : (
        // Figma uses the same arrow as the back button, flipped to point right.
        <View style={styles.flipped}>
          <ArrowLeftIcon
            width={ICON_SIZE}
            height={ICON_SIZE}
            color={colors.deepOlive}
          />
        </View>
      )}
    </Pressable>
  );
}
