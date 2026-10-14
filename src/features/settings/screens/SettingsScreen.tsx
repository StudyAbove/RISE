import {
  Alert,
  AppState,
  Image,
  Linking,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';

import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import WarningIcon from '../../../../assets/icons/warning.svg';

import { BackButton } from '../../../components/BackButton';

import { CalendarConnectionModal } from '../../calendar/components/CalendarConnectionModal';
import { CalendarSyncSuccessModal } from '../../calendar/components/CalendarSyncSuccessModal';

import {
  getAppleCalendarAccess,
  requestAppleCalendarFullAccess,
} from '../../calendar/services/calendarService';

import {
  getCalendarConnection,
  saveCalendarConnection,
} from '../../calendar/services/calendarConnectionService';

import {
  getGoogleUserInfo,
  hasGoogleCalendarAccess,
} from '../../calendar/services/googleCalendarService';

import { supabase } from '../../../lib/supabase';
import { styles } from './SettingsScreen.styles';

WebBrowser.maybeCompleteAuthSession();

const logoutIcon =
  require('../../../../assets/icons/logout.png');

const calendarIcon =
  require('../../../../assets/icons/calendar.png');

const chevronRightIcon =
  require('../../../../assets/icons/chevron-right.png');

const googleIosClientId =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const [isCalendarModalVisible, setIsCalendarModalVisible] =
    useState(false);

  const [isSuccessModalVisible, setIsSuccessModalVisible] =
    useState(false);

  const [successProvider, setSuccessProvider] =
    useState<'Apple' | 'Google'>('Apple');

  const [appleConnected, setAppleConnected] =
    useState(false);

  const [googleConnected, setGoogleConnected] =
    useState(false);

  const [googleEmail, setGoogleEmail] =
    useState<string | null>(null);

  const [isConnectingApple, setIsConnectingApple] =
    useState(false);

  const [isConnectingGoogle, setIsConnectingGoogle] =
    useState(false);

  const [isLogoutModalVisible, setIsLogoutModalVisible] =
    useState(false);

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const [googleRequest, googleResponse, promptGoogleAsync] =
    Google.useAuthRequest({
      iosClientId: googleIosClientId,
      scopes: [
        'openid',
        'profile',
        'email',
        'https://www.googleapis.com/auth/calendar',
      ],
      selectAccount: true,
    });

  async function loadCalendarConnections() {
    try {
      const appleAccess =
        await getAppleCalendarAccess();

      const appleConnection =
        await getCalendarConnection('apple');

      const isAppleConnected =
        appleAccess === 'full' &&
        appleConnection?.connected === true;

      setAppleConnected(isAppleConnected);
    } catch (error) {
      console.log(
        'Could not load Apple Calendar connection:',
        error,
      );

      setAppleConnected(false);
    }

    try {
      const googleConnection =
        await getCalendarConnection('google');

      if (
        googleConnection &&
        googleConnection.connected
      ) {
        setGoogleConnected(true);

        setGoogleEmail(
          googleConnection.provider_email,
        );
      } else {
        setGoogleConnected(false);
        setGoogleEmail(null);
      }
    } catch (error) {
      console.log(
        'Could not load Google Calendar connection:',
        error,
      );

      setGoogleConnected(false);
      setGoogleEmail(null);
    }
  }

  useEffect(() => {
    loadCalendarConnections();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState) => {
        if (nextAppState === 'active') {
          loadCalendarConnections();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    async function handleGoogleResponse() {
      if (!googleResponse) {
        return;
      }

      if (
        googleResponse.type === 'dismiss' ||
        googleResponse.type === 'cancel'
      ) {
        setIsConnectingGoogle(false);
        return;
      }

      if (googleResponse.type === 'error') {
        console.log(
          'Google Calendar OAuth error:',
          googleResponse.error,
        );

        setIsConnectingGoogle(false);

        Alert.alert(
          'Unable to connect calendar',
          'Something went wrong while connecting Google Calendar. Please try again.',
        );

        return;
      }

      if (googleResponse.type !== 'success') {
        return;
      }

      try {
        const accessToken =
          googleResponse.authentication?.accessToken ??
          googleResponse.params.access_token;

        if (!accessToken) {
          throw new Error(
            'Google did not return an access token.',
          );
        }

        const hasCalendarAccess =
          await hasGoogleCalendarAccess(
            accessToken,
          );

        if (!hasCalendarAccess) {
          setGoogleConnected(false);
          setGoogleEmail(null);

          Alert.alert(
            'Google Calendar access needed',
            'RISE needs Google Calendar permission to connect your calendar. Please try again and select the Google Calendar permission.',
          );

          return;
        }

        const googleUser =
          await getGoogleUserInfo(
            accessToken,
          );

        await saveCalendarConnection(
          'google',
          googleUser.email,
        );

        setGoogleEmail(
          googleUser.email,
        );

        setGoogleConnected(true);

        setIsCalendarModalVisible(false);

        setSuccessProvider('Google');

        setIsSuccessModalVisible(true);
      } catch (error) {
        console.log(
          'Google Calendar connection failed:',
          error,
        );

        Alert.alert(
          'Unable to connect calendar',
          'Something went wrong while connecting Google Calendar. Please try again.',
        );
      } finally {
        setIsConnectingGoogle(false);
      }
    }

    handleGoogleResponse();
  }, [googleResponse]);

  function handleCalendarPress() {
    setIsCalendarModalVisible(true);
  }

  function handleCloseCalendarModal() {
    setIsCalendarModalVisible(false);
  }

  async function handleConnectApple() {
    if (isConnectingApple) {
      return;
    }

    try {
      setIsConnectingApple(true);

      const permission =
        await requestAppleCalendarFullAccess();

      if (permission.status !== 'granted') {
        const currentAccess =
          await getAppleCalendarAccess();

        const message =
          currentAccess === 'write-only'
            ? 'RISE currently has Add Events Only access. Full Calendar Access is required so RISE can read your schedule and plan study sessions around existing events. Open RISE settings and select Full Access for Calendars.'
            : 'Calendar access is turned off for RISE. Open RISE settings and enable Full Access for Calendars to connect Apple Calendar.';

        Alert.alert(
          'Full Calendar Access needed',
          message,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings();
              },
            },
          ],
        );

        return;
      }

      const confirmedAccess =
        await getAppleCalendarAccess();

      if (confirmedAccess !== 'full') {
        Alert.alert(
          'Full Calendar Access needed',
          'RISE requires Full Access rather than Add Events Only so it can read your existing schedule and plan study sessions around it.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings();
              },
            },
          ],
        );

        return;
      }

      await saveCalendarConnection(
        'apple',
        null,
      );

      setAppleConnected(true);

      setIsCalendarModalVisible(false);

      setSuccessProvider('Apple');

      setIsSuccessModalVisible(true);
    } catch (error) {
      console.log(
        'Apple Calendar connection failed:',
        error,
      );

      Alert.alert(
        'Unable to connect calendar',
        'Something went wrong while connecting Apple Calendar. Please try again.',
      );
    } finally {
      setIsConnectingApple(false);
    }
  }

  async function handleConnectGoogle() {
    if (isConnectingGoogle) {
      return;
    }

    if (!googleIosClientId) {
      console.log(
        'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is missing.',
      );

      Alert.alert(
        'Google Calendar unavailable',
        'The Google Calendar connection has not been configured yet.',
      );

      return;
    }

    if (!googleRequest) {
      return;
    }

    try {
      setIsConnectingGoogle(true);

      await promptGoogleAsync();
    } catch (error) {
      console.log(
        'Could not open Google Calendar sign in:',
        error,
      );

      setIsConnectingGoogle(false);

      Alert.alert(
        'Unable to connect calendar',
        'Something went wrong while opening Google sign in. Please try again.',
      );
    }
  }

  function handleSuccessDone() {
    setIsSuccessModalVisible(false);
  }

  function handleLogoutPress() {
    setIsLogoutModalVisible(true);
  }

  function handleCancelLogout() {
    setIsLogoutModalVisible(false);
  }

  async function handleConfirmLogout() {
    setIsLoggingOut(true);

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.log(
        'Logout failed:',
        error.message,
      );

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

        <Text
          accessibilityRole="header"
          style={styles.title}
        >
          Settings
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View
          style={[
            styles.logoutCard,
            {
              marginBottom: 16,
            },
          ]}
        >
          <Image
            source={calendarIcon}
            style={styles.logoutIcon}
          />

          <Text
            style={[
              styles.logoutText,
              {
                flex: 1,
              },
            ]}
          >
            Calendar
          </Text>

          <Pressable
            onPress={handleCalendarPress}
            style={({ pressed }) => [
              {
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open calendar settings"
          >
            <Image
              source={chevronRightIcon}
              style={{
                width: 24,
                height: 24,
                resizeMode: 'contain',
              }}
            />
          </Pressable>
        </View>

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

      <CalendarConnectionModal
        visible={isCalendarModalVisible}
        appleConnected={appleConnected}
        googleConnected={googleConnected}
        googleEmail={googleEmail}
        isConnectingApple={isConnectingApple}
        isConnectingGoogle={isConnectingGoogle}
        onClose={handleCloseCalendarModal}
        onConnectApple={handleConnectApple}
        onConnectGoogle={handleConnectGoogle}
      />

      <CalendarSyncSuccessModal
        visible={isSuccessModalVisible}
        provider={successProvider}
        onDone={handleSuccessDone}
      />

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
                <WarningIcon
                  width={22}
                  height={22}
                />
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
                <Text
                  style={
                    styles.modalCancelButtonText
                  }
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalLogoutButton,
                  pressed && styles.pressed,
                  isLoggingOut &&
                    styles.disabledButton,
                ]}
                onPress={handleConfirmLogout}
                disabled={isLoggingOut}
                accessibilityRole="button"
                accessibilityLabel="Confirm logout"
              >
                <Text
                  style={
                    styles.modalLogoutButtonText
                  }
                >
                  {isLoggingOut
                    ? 'Logging out...'
                    : 'Logout'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}