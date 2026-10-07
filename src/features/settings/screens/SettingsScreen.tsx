import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '../../../components/BackButton';
import { styles } from './SettingsScreen.styles';

/**
 * Settings page, opened from the gear on the main pages. It opens on top of
 * the tabs, so the nav bar is hidden here (matches Figma).
 *
 * Only the header exists so far; the account, integration, preference and
 * logout options from Figma still need to be built.
 */
export function SettingsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton />
        <Text accessibilityRole="header" style={styles.title}>
          Settings
        </Text>
        {/* Balances the back button so the title stays centered. */}
        <View style={styles.headerSpacer} />
      </View>
    </View>
  );
}
