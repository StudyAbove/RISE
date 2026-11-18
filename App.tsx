import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/features/navigation/navigators/RootNavigator';
import { navigationRef } from './src/features/navigation/navigationRef';
import {
  handleAcademicNotificationResponse,
  openPendingAcademicNotification,
} from './src/features/notifications/services/notificationNavigationService';
import { supabase } from './src/lib/supabase';
import { fontAssets } from './src/theme/fontAssets';

// Keep the splash screen visible until the app fonts finish loading.
SplashScreen.preventAutoHideAsync();

const INVALID_LINK_MESSAGE =
  'This verification link is invalid, expired, or has already been used. Please request a new link.';

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [authLinkError, setAuthLinkError] = useState('');

  const isReady = fontsLoaded || fontError !== null;

  // Hide the splash screen once the fonts are ready.
  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  /*
   * Open an assignment when the student taps one of RISE's
   * academic deadline notifications (#30).
   *
   * The listener covers RISE while it is running. The last-response
   * check covers a notification that launched RISE from a closed state.
   */
  useEffect(() => {
    function handleResponse(
      response: Notifications.NotificationResponse,
    ) {
      handleAcademicNotificationResponse(
        response,
      );
    }

    const subscription =
      Notifications
        .addNotificationResponseReceivedListener(
          handleResponse,
        );

    void Notifications
      .getLastNotificationResponseAsync()
      .then(
        async (response) => {
          if (!response) {
            return;
          }

          handleResponse(response);

          /*
           * Prevent the same cold-start notification from reopening
           * again on a later app launch.
           */
          await Notifications
            .clearLastNotificationResponseAsync();
        },
      )
      .catch((error) => {
        console.log(
          'Could not read the last notification response:',
          error,
        );
      });

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle Supabase authentication links that open RISE.
  useEffect(() => {
    async function handleAuthCallback(url: string) {
      try {
        const parsedUrl = new URL(url);

        // Supabase can return auth errors in either:
        // - the query string
        // - the URL fragment after #
        //
        // This is important for expired or already-used magic links.
        const hashPart = url.split('#')[1];
        const hashParams = hashPart
          ? new URLSearchParams(hashPart)
          : null;

        const callbackError =
          parsedUrl.searchParams.get('error') ||
          parsedUrl.searchParams.get('error_code') ||
          parsedUrl.searchParams.get('error_description') ||
          hashParams?.get('error') ||
          hashParams?.get('error_code') ||
          hashParams?.get('error_description');

        if (callbackError) {
          setAuthLinkError(INVALID_LINK_MESSAGE);
          return;
        }

        // PKCE flow:
        // Supabase may return a one-time authentication code.
        const code = parsedUrl.searchParams.get('code');

        if (code) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            setAuthLinkError(INVALID_LINK_MESSAGE);
            return;
          }

          setAuthLinkError('');
          return;
        }

        // Fallback for links that return access and refresh tokens.
        if (hashParams) {
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              setAuthLinkError(INVALID_LINK_MESSAGE);
              return;
            }

            setAuthLinkError('');
            return;
          }
        }
      } catch {
        setAuthLinkError(INVALID_LINK_MESSAGE);
      }
    }

    // Handles a link while RISE is already running.
    const subscription = Linking.addEventListener(
      'url',
      ({ url }) => {
        handleAuthCallback(url);
      }
    );

    // Handles a link that launches RISE from a closed state.
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleAuthCallback(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={
          openPendingAcademicNotification
        }
      >
        <RootNavigator authLinkError={authLinkError} />
      </NavigationContainer>

      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}