import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CreateAccountScreen from '../../auth/screens/CreateAccountScreen';
import LoginScreen from '../../auth/screens/LoginScreen';
import WelcomeScreen from '../../auth/screens/WelcomeScreen';
import OnboardingScreen from '../../onboarding/screens/OnboardingScreen';
import { SettingsScreen } from '../../settings/screens/SettingsScreen';
import { supabase } from '../../../lib/supabase';
import type { RootStackParamList } from '../types';
import { MainTabNavigator } from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

type RootNavigatorProps = {
  authLinkError?: string;
};

export function RootNavigator({
  authLinkError = '',
}: RootNavigatorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] =
    useState(false);

  async function loadAuthState() {
    setIsLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setIsSignedIn(false);
      setHasCompletedOnboarding(false);
      setIsLoading(false);
      return;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      console.log(
        'Could not load onboarding status:',
        error.message
      );
    }

    setHasCompletedOnboarding(
      profile?.onboarding_completed ?? false
    );
    setIsSignedIn(true);
    setIsLoading(false);
  }

  useEffect(() => {
    loadAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadAuthState();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAF8F1',
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isSignedIn ? (
        <>
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
          />

          <Stack.Screen name="CreateAccount">
            {() => (
              <CreateAccountScreen
                authLinkError={authLinkError}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Login">
            {() => (
              <LoginScreen
                authLinkError={authLinkError}
              />
            )}
          </Stack.Screen>
        </>
      ) : !hasCompletedOnboarding ? (
        <Stack.Screen name="Onboarding">
          {() => (
            <OnboardingScreen
              onComplete={() => {
                setHasCompletedOnboarding(true);
              }}
            />
          )}
        </Stack.Screen>
      ) : (
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabNavigator}
          />

          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
}