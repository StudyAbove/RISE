import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { BottomNavBar } from '../components/BottomNavBar';
import { MAIN_TABS } from '../config/mainTabs';
import type { MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * The main section of the app, shown after sign in and onboarding.
 * Every page in here gets the bottom nav bar.
 *
 * To give a tab detail screens (e.g. assignment details), replace its
 * `component` with a native stack navigator.
 */
export function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomNavBar {...props} />}
    >
      {MAIN_TABS.map(({ name, label, component, icon: { Icon, width, height } }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            tabBarLabel: label,
            tabBarButtonTestID: `nav-tab-${name}`,
            tabBarIcon: ({ color }) => <Icon width={width} height={height} color={color} />,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
