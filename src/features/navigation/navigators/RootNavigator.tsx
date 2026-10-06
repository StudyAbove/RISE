import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CreateAccountScreen from '../../auth/screens/CreateAccountScreen';
import OnboardingScreen from '../../onboarding/screens/OnboardingScreen';
import { supabase } from '../../../lib/supabase';
import type { RootStackParamList } from '../types';
import { MainTabNavigator } from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] =
    useState(false);

  async function loadAuthState() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setIsSignedIn(false);
      setHasCompletedOnboarding(false);
      setIsLoading(false);
      return;
    }

    setIsSignedIn(true);

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
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isSignedIn ? (
        <Stack.Screen
          name="CreateAccount"
          component={CreateAccountScreen}
        />
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
        <Stack.Screen
          name="MainTabs"
          component={MainTabNavigator}
        />
      )}
    </Stack.Navigator>
  );
}