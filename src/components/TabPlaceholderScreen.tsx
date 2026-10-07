import { useRef } from 'react';
import { Text, View } from 'react-native';

import { TabScreenScrollView } from './TabScreenScrollView';
import { styles } from './TabPlaceholderScreen.styles';

// Enough blocks to make the page scroll on every iPhone size, so the
// re-tap to scroll-to-top behavior can be tried before real content exists.
const PLACEHOLDER_BLOCK_COUNT = 8;

interface TabPlaceholderScreenProps {
  title: string;
}

/**
 * Temporary main page for a bottom tab that has not been built yet.
 * Replace with the real screen (built on TabScreenScrollView) when it's ready.
 */
export function TabPlaceholderScreen({ title }: TabPlaceholderScreenProps) {
  const titleRef = useRef<Text>(null);

  return (
    <TabScreenScrollView focusTargetRef={titleRef}>
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
