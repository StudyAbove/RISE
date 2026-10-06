import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../types';
import { MainTabNavigator } from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Top-level navigator.
 *
 * TODO(auth): Once the sign-in and onboarding screens are ready, register
 * them here and only register MainTabs for signed-in, onboarded users, so
 * the nav bar never appears before sign in (#54 AC 5).
 */
export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
    </Stack.Navigator>
  );
}
