import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/features/navigation/navigators/RootNavigator';
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

  // Handle Supabase authentication links that open RISE.
  useEffect(() => {
    async function handleAuthCallback(url: string) {
      try {
        const parsedUrl = new URL(url);

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
        const hashPart = url.split('#')[1];

        if (hashPart) {
          const params = new URLSearchParams(hashPart);

          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

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
      <NavigationContainer>
        <RootNavigator authLinkError={authLinkError} />
      </NavigationContainer>

      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}