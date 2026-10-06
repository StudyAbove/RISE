import { Text, View } from 'react-native';

import { styles } from './PlaceholderScreen.styles';

interface PlaceholderScreenProps {
  title: string;
}

/**
 * Temporary full-screen page for flows that have not been built yet
 * (sign in, account creation, onboarding). Replace with the real screen.
 */
export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.subtitle}>This page is coming soon.</Text>
    </View>
  );
}
