import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import {
  clearAppleCalendarConnectionPending,
  isAppleCalendarConnectionPending,
  markAppleCalendarConnectionPending,
  saveLastAppleCalendarAccess,
} from '../services/appleCalendarConnectionStateService';
import {
  startAppleCalendarBackgroundSync,
  startGoogleCalendarBackgroundSync,
} from '../services/calendarBackgroundSyncService';
import {
  deleteCalendarConnection,
  getCalendarConnection,
  saveCalendarConnection,
} from '../services/calendarConnectionService';
import {
  getAppleCalendarAccess,
  requestAppleCalendarFullAccess,
} from '../services/calendarService';
import {
  getGoogleUserInfo,
  hasGoogleCalendarAccess,
} from '../services/googleCalendarService';
import {
  clearGoogleAccessToken,
  saveGoogleAccessToken,
} from '../services/googleTokenService';

WebBrowser.maybeCompleteAuthSession();

const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export type CalendarProviderName = 'Apple' | 'Google';

type UseCalendarConnectionOptions = {
  /** Called once a calendar finishes connecting so the screen can confirm it. */
  onConnected: (provider: CalendarProviderName) => void;
};

/**
 * Connects and disconnects Apple and Google Calendar.
 *
 * Settings and onboarding both use this so they run the same permission,
 * saving, and background sync steps.
 */
export function useCalendarConnection({
  onConnected,
}: UseCalendarConnectionOptions) {
  const [appleConnected, setAppleConnected] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [isConnectingApple, setIsConnectingApple] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  // The AppState listener is registered once, so read the latest callback
  // from a ref instead of the one from the first render.
  const onConnectedRef = useRef(onConnected);

  useEffect(() => {
    onConnectedRef.current = onConnected;
  });

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

  /**
   * Finishes an initial Apple Calendar connection after the student was sent
   * from RISE to iOS Settings.
   *
   * This is different from restoring access to an already connected calendar.
   * Only an initial connection calls onConnected.
   */
  async function completePendingAppleConnection() {
    try {
      const isPending = await isAppleCalendarConnectionPending();

      if (!isPending) {
        return false;
      }

      const appleAccess = await getAppleCalendarAccess();

      await saveLastAppleCalendarAccess(appleAccess);

      if (appleAccess !== 'full') {
        return false;
      }

      await saveCalendarConnection('apple', null);
      await clearAppleCalendarConnectionPending();

      setAppleConnected(true);

      // Don't make the student wait for every Apple event to sync before
      // confirming that the connection itself worked.
      void startAppleCalendarBackgroundSync()
        .then((result) => {
          console.log(
            'Background Apple Calendar settings-return sync complete:',
            result,
          );
        })
        .catch((syncError) => {
          console.log(
            'Background Apple Calendar settings-return sync failed:',
            syncError,
          );
        });

      onConnectedRef.current('Apple');

      return true;
    } catch (error) {
      console.log(
        'Could not complete pending Apple Calendar connection:',
        error,
      );

      return false;
    }
  }

  /**
   * Loads whether each calendar is connected.
   *
   * Apple counts as connected only when RISE has a saved Apple connection and
   * iOS currently gives RISE Full Calendar Access.
   *
   * Permission changes while the student is elsewhere in the app are handled
   * by RootNavigator.
   */
  async function loadCalendarConnections() {
    try {
      const appleAccess = await getAppleCalendarAccess();
      const appleConnection = await getCalendarConnection('apple');

      setAppleConnected(
        appleAccess === 'full' && appleConnection?.connected === true,
      );
    } catch (error) {
      console.log('Could not load Apple Calendar connection:', error);

      setAppleConnected(false);
    }

    try {
      const googleConnection = await getCalendarConnection('google');

      if (googleConnection && googleConnection.connected) {
        setGoogleConnected(true);
        setGoogleEmail(googleConnection.provider_email);
      } else {
        setGoogleConnected(false);
        setGoogleEmail(null);
      }
    } catch (error) {
      console.log('Could not load Google Calendar connection:', error);

      setGoogleConnected(false);
      setGoogleEmail(null);
    }
  }

  useEffect(() => {
    loadCalendarConnections();
  }, []);

  // When the student comes back from iOS Settings, finish a pending first
  // Apple connection, or refresh the connection indicators.
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState) => {
        if (nextAppState === 'active') {
          void (async () => {
            const completedPendingConnection =
              await completePendingAppleConnection();

            if (!completedPendingConnection) {
              await loadCalendarConnections();
            }
          })();
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
        console.log('Google Calendar OAuth error:', googleResponse.error);

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
          throw new Error('Google did not return an access token.');
        }

        const hasCalendarAccess = await hasGoogleCalendarAccess(accessToken);

        if (!hasCalendarAccess) {
          setGoogleConnected(false);
          setGoogleEmail(null);

          Alert.alert(
            'Google Calendar access needed',
            'RISE needs Google Calendar permission to connect your calendar. Please try again and select the Google Calendar permission.',
          );

          return;
        }

        const googleUser = await getGoogleUserInfo(accessToken);

        await saveCalendarConnection('google', googleUser.email);
        // The refresh token and expiry let the access token be renewed when it
        // runs out after about an hour, instead of needing a reconnect (#123).
        await saveGoogleAccessToken(accessToken, {
          refreshToken: googleResponse.authentication?.refreshToken,
          expiresIn: googleResponse.authentication?.expiresIn,
          issuedAt: googleResponse.authentication?.issuedAt,
        });

        setGoogleEmail(googleUser.email);
        setGoogleConnected(true);

        void startGoogleCalendarBackgroundSync()
          .then((result) => {
            console.log('Background Google Calendar sync complete:', result);
          })
          .catch((syncError) => {
            console.log('Background Google Calendar sync failed:', syncError);
          });

        onConnectedRef.current('Google');
      } catch (error) {
        console.log('Google Calendar connection failed:', error);

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

  // Sends the student to iOS Settings to turn on Full Access, and remembers
  // that a first connection is in progress so it can finish when they return.
  function showFullAccessNeededAlert(message: string) {
    Alert.alert('Full Calendar Access needed', message, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Open Settings',
        onPress: () => {
          void (async () => {
            try {
              await markAppleCalendarConnectionPending();
              await Linking.openSettings();
            } catch (error) {
              console.log(
                'Could not open iOS Settings for Apple Calendar:',
                error,
              );
            }
          })();
        },
      },
    ]);
  }

  async function connectApple() {
    if (isConnectingApple) {
      return;
    }

    try {
      setIsConnectingApple(true);

      const permission = await requestAppleCalendarFullAccess();

      if (permission.status !== 'granted') {
        const currentAccess = await getAppleCalendarAccess();

        // Remember that Apple is unavailable. If this calendar was connected
        // before and permission later returns to Full, the app-level
        // reconnect check can recognize that change.
        await saveLastAppleCalendarAccess(currentAccess);

        showFullAccessNeededAlert(
          currentAccess === 'write-only'
            ? 'RISE currently has Add Events Only access. Full Calendar Access is required so RISE can read your schedule and plan study sessions around existing events. Open RISE settings and select Full Access for Calendars.'
            : 'Calendar access is turned off for RISE. Open RISE settings and enable Full Access for Calendars to connect Apple Calendar.',
        );

        return;
      }

      const confirmedAccess = await getAppleCalendarAccess();

      await saveLastAppleCalendarAccess(confirmedAccess);

      if (confirmedAccess !== 'full') {
        showFullAccessNeededAlert(
          'RISE requires Full Access rather than Add Events Only so it can read your existing schedule and plan study sessions around it.',
        );

        return;
      }

      // Full Access was granted from Apple's first prompt. No pending flag is
      // needed because the student never left RISE.
      await saveCalendarConnection('apple', null);
      await clearAppleCalendarConnectionPending();
      await saveLastAppleCalendarAccess('full');

      setAppleConnected(true);

      // Start syncing without waiting for the whole import before confirming
      // the connection.
      void startAppleCalendarBackgroundSync()
        .then((result) => {
          console.log('Background Apple Calendar sync complete:', result);
        })
        .catch((syncError) => {
          console.log('Background Apple Calendar sync failed:', syncError);
        });

      onConnectedRef.current('Apple');
    } catch (error) {
      console.log('Apple Calendar connection failed:', error);

      Alert.alert(
        'Unable to connect calendar',
        'Something went wrong while connecting Apple Calendar. Please try again.',
      );
    } finally {
      setIsConnectingApple(false);
    }
  }

  async function connectGoogle() {
    if (isConnectingGoogle) {
      return;
    }

    if (!googleIosClientId) {
      console.log('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is missing.');

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
      console.log('Could not open Google Calendar sign in:', error);

      setIsConnectingGoogle(false);

      Alert.alert(
        'Unable to connect calendar',
        'Something went wrong while opening Google sign in. Please try again.',
      );
    }
  }

  async function disconnectGoogle() {
    try {
      await clearGoogleAccessToken();
      await deleteCalendarConnection('google');

      setGoogleConnected(false);
      setGoogleEmail(null);
    } catch (error) {
      console.log('Google Calendar disconnect failed:', error);

      Alert.alert(
        'Unable to disconnect calendar',
        'Something went wrong while disconnecting Google Calendar. Please try again.',
      );
    }
  }

  return {
    appleConnected,
    googleConnected,
    googleEmail,
    isConnectingApple,
    isConnectingGoogle,
    connectApple,
    connectGoogle,
    disconnectGoogle,
  };
}
