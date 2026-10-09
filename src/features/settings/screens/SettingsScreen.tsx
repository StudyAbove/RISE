import { Image, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

import WarningIcon from '../../../../assets/icons/warning.svg';
import { BackButton } from '../../../components/BackButton';
import { supabase } from '../../../lib/supabase';
import { styles } from './SettingsScreen.styles';

const logoutIcon = require('../../../../assets/icons/logout.png');

export function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const [isLogoutModalVisible, setIsLogoutModalVisible] =
    useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  function handleLogoutPress() {
    setIsLogoutModalVisible(true);
  }

  function handleCancelLogout() {
    setIsLogoutModalVisible(false);
  }

  async function handleConfirmLogout() {
    setIsLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.log('Logout failed:', error.message);
      setIsLoggingOut(false);
      return;
    }

    setIsLogoutModalVisible(false);
    setIsLoggingOut(false);
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.header}>
        <BackButton />

        <Text accessibilityRole="header" style={styles.title}>
          Settings
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Pressable
          style={({ pressed }) => [
            styles.logoutCard,
            pressed && styles.pressed,
          ]}
          onPress={handleLogoutPress}
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <Image
            source={logoutIcon}
            style={styles.logoutIcon}
          />

          <Text style={styles.logoutText}>
            Logout
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={isLogoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelLogout}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.warningIconOuter}>
              <View style={styles.warningIconInner}>
                <WarningIcon width={22} height={22} />
              </View>
            </View>

            <Text style={styles.modalTitle}>
              Oh no! You’re leaving...
            </Text>

            <Text style={styles.modalMessage}>
              Are you sure you want to logout?
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalCancelButton,
                  pressed && styles.pressed,
                ]}
                onPress={handleCancelLogout}
                disabled={isLoggingOut}
                accessibilityRole="button"
                accessibilityLabel="Cancel logout"
              >
                <Text style={styles.modalCancelButtonText}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalLogoutButton,
                  pressed && styles.pressed,
                  isLoggingOut && styles.disabledButton,
                ]}
                onPress={handleConfirmLogout}
                disabled={isLoggingOut}
                accessibilityRole="button"
                accessibilityLabel="Confirm logout"
              >
                <Text style={styles.modalLogoutButtonText}>
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}