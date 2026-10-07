import { useRef } from 'react';
import { Text, View } from 'react-native';

import { SettingsButton } from '../features/settings/components/SettingsButton';
import { TabScreenScrollView } from './TabScreenScrollView';
import { styles } from './TabPlaceholderScreen.styles';

// Enough blocks to make the page scroll on every iPhone size, so the
// re-tap to scroll-to-top behavior can be tried before real content exists.
const PLACEHOLDER_BLOCK_COUNT = 8;

interface TabPlaceholderScreenProps {
  title: string;
  /** Shows the settings gear in the top-right (every main page except Calendar). */
  showSettingsButton?: boolean;
}

/**
 * Temporary main page for a bottom tab that has not been built yet.
 * Replace with the real screen (built on TabScreenScrollView) when it's ready.
 */
export function TabPlaceholderScreen({
  title,
  showSettingsButton = false,
}: TabPlaceholderScreenProps) {
  const titleRef = useRef<Text>(null);

  return (
    <TabScreenScrollView focusTargetRef={titleRef}>
      {/* Same height on every tab, so titles line up whether or not the gear is shown. */}
      <View style={styles.headerRow}>{showSettingsButton && <SettingsButton />}</View>
      <Text ref={titleRef} accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.subtitle}>This page is coming soon.</Text>

      {Array.from({ length: PLACEHOLDER_BLOCK_COUNT }, (_, index) => (
        <View key={index} style={styles.placeholderBlock} />
      ))}
    </TabScreenScrollView>
  );
}
