import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '../../../components/BackButton';
import { styles } from './HelpToolLayout.styles';

type HelpToolLayoutProps = {
  title: string;
  subtitle: string;
  children?: ReactNode;
};

/**
 * The page shared by the tools in the help menu (#70): the back button, a
 * title and a short subtitle, as on the Figma "Help - Breath", "Help - Email"
 * and "Help - Office Hours" screens. Back returns to where Help was opened.
 */
export function HelpToolLayout({ title, subtitle, children }: HelpToolLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <View style={styles.backButtonContainer}>
        <BackButton />
      </View>

      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {children}
    </ScrollView>
  );
}
