import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
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

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
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
            Alert.alert(
              'Sign in failed',
              'We could not finish signing you in. Please try again.'
            );

            return;
          }

          // Later:
          // New accounts will continue to onboarding here.
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
              Alert.alert(
                'Sign in failed',
                'We could not finish signing you in. Please try again.'
              );

              return;
            }
            
            // Later:
            // New accounts will continue to onboarding here.
          }
        }
      } catch {
        Alert.alert(
          'Sign in failed',
          'Something went wrong while signing you in.'
        );
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
        <RootNavigator />
      </NavigationContainer>

      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}