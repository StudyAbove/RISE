import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuthStatus } from '../../auth/hooks/useAuthStatus';
import { CreateAccountScreen } from '../../auth/screens/CreateAccountScreen';
import { SignInScreen } from '../../auth/screens/SignInScreen';
import { OnboardingScreen } from '../../onboarding/screens/OnboardingScreen';
import type { RootStackParamList } from '../types';
import { MainTabNavigator } from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Chooses which part of the app the user can reach based on their auth status.
 *
 * Only one group of screens is registered at a time, so signed-out and
 * onboarding users cannot reach the main tabs (and never see the nav bar).
 * When the status changes, React Navigation moves to the new group's first screen.
 */
export function RootNavigator() {
  const { isSignedIn, hasCompletedOnboarding } = useAuthStatus();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isSignedIn ? (
        <Stack.Group>
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
        </Stack.Group>
      ) : !hasCompletedOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      )}
    </Stack.Navigator>
  );
}
