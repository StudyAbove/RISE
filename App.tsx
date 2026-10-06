import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import CreateAccountScreen from './src/features/auth/screens/CreateAccountScreen';
import { supabase } from './src/lib/supabase';

export default function App() {
  const [callbackStatus, setCallbackStatus] = useState(
    'Waiting for authentication callback...'
  );

  useEffect(() => {
    async function handleAuthCallback(url: string) {
      setCallbackStatus('RISE received the authentication link.');

      try {
        const parsedUrl = new URL(url);

        // PKCE flow
        const code = parsedUrl.searchParams.get('code');

        if (code) {
          setCallbackStatus(
            'Authentication code received. Creating session...'
          );

          const { error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            setCallbackStatus(
              `Session error: ${error.message}`
            );

            Alert.alert(
              'Sign in failed',
              'We could not finish signing you in.'
            );

            return;
          }

          setCallbackStatus(
            'Success: Supabase session created.'
          );

          Alert.alert(
            'Success',
            'Your RISE account is now signed in.'
          );

          return;
        }

        // Implicit flow
        const hashPart = url.split('#')[1];

        if (hashPart) {
          const params = new URLSearchParams(hashPart);

          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            setCallbackStatus(
              'Authentication tokens received. Creating session...'
            );

            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              setCallbackStatus(
                `Session error: ${error.message}`
              );

              Alert.alert(
                'Sign in failed',
                'We could not finish signing you in.'
              );

              return;
            }

            setCallbackStatus(
              'Success: Supabase session created.'
            );

            Alert.alert(
              'Success',
              'Your RISE account is now signed in.'
            );

            return;
          }
        }

        setCallbackStatus(
          'RISE opened, but no authentication code or tokens were found.'
        );
      } catch (error) {
        setCallbackStatus(
          'Something went wrong while processing the authentication link.'
        );

        Alert.alert(
          'Sign in failed',
          'Something went wrong while signing you in.'
        );
      }
    }

    const subscription = Linking.addEventListener(
      'url',
      ({ url }) => {
        handleAuthCallback(url);
      }
    );

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleAuthCallback(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <CreateAccountScreen />

      <View style={styles.debugBox}>
        <Text style={styles.debugText}>
          {callbackStatus}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  debugBox: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE8D7',
    borderRadius: 10,
    padding: 10,
  },

  debugText: {
    fontSize: 12,
    color: '#35433B',
    textAlign: 'center',
  },
});