import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { styles } from './BottomNavBarItem.styles';

// Lets labels grow with Dynamic Type while still fitting five tabs across
// the narrowest supported iPhone.
const MAX_LABEL_FONT_SCALE = 1.5;

interface BottomNavBarItemProps {
  label: string;
  accessibilityLabel: string;
  icon: ReactNode;
  onPress: () => void;
  onLongPress: () => void;
  testID?: string;
}

/** A single tab button in the bottom nav bar: an icon with a text label. */
export function BottomNavBarItem({
  label,
  accessibilityLabel,
  icon,
  onPress,
  onLongPress,
  testID,
}: BottomNavBarItemProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      testID={testID}
      style={styles.item}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={MAX_LABEL_FONT_SCALE}
        style={styles.label}
      >
        {label}
      </Text>
    </Pressable>
  );
}
