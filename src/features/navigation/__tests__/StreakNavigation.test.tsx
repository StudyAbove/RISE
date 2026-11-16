import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { HomeHeader } from '../../home/components/HomeHeader';
import { StreakScreen } from '../../streak/screens/StreakScreen';
import type { RootStackParamList } from '../types';

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'student' } } }, error: null }) },
  },
}));

jest.mock('../../../repositories/assignmentsRepository', () => ({
  fetchAssignments: async () => [],
}));

const Stack = createNativeStackNavigator<RootStackParamList>();

// Stands in for Home, which only needs its header to reach the Streak page.
function HomeStandIn() {
  return <HomeHeader date={new Date(2026, 10, 11, 9, 0)} firstName="Fahd" />;
}

async function renderFromHome() {
  await render(
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{ headerShown: false, animation: 'none' }}
      >
        <Stack.Screen name="MainTabs" component={HomeStandIn} />
        <Stack.Screen name="Streak" component={StreakScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('Home to Streak navigation', () => {
  it('opens the Streak page from the streak pill on Home and goes back', async () => {
    await renderFromHome();

    await fireEvent.press(screen.getByRole('button', { name: 'Streak' }));

    expect(await screen.findByRole('header', { name: 'Your Streak' })).toBeOnTheScreen();
    expect(await screen.findByText('0 days')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByRole('header', { name: 'Good morning, Fahd' })).toBeOnTheScreen();
  });
});
