import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { styles } from './TabPlaceholderScreen.styles';

// Enough blocks to make the page scroll on every iPhone size.
const PLACEHOLDER_BLOCK_COUNT = 8;

interface TabPlaceholderScreenProps {
  title: string;
}

/**
 * Temporary main page for a bottom tab that has not been built yet.
 * Replace with the real screen when it's ready.
 */
export function TabPlaceholderScreen({ title }: TabPlaceholderScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top }]}
    >
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.subtitle}>This page is coming soon.</Text>

      {Array.from({ length: PLACEHOLDER_BLOCK_COUNT }, (_, index) => (
        <View key={index} style={styles.placeholderBlock} />
      ))}
    </ScrollView>
  );
}
