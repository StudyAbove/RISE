import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { styles } from './BottomNavBarItem.styles';

interface BottomNavBarItemProps {
  /** Read by screen readers; the tab itself shows only its icon, as in the Figma. */
  accessibilityLabel: string;
  icon: ReactNode;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  testID?: string;
}

/** A single tab button in the bottom nav bar: an icon with a highlight when selected. */
export function BottomNavBarItem({
  accessibilityLabel,
  icon,
  isSelected,
  onPress,
  onLongPress,
  testID,
}: BottomNavBarItemProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      onLongPress={onLongPress}
      testID={testID}
      style={styles.item}
    >
      <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
        {icon}
      </View>
    </Pressable>
  );
}
