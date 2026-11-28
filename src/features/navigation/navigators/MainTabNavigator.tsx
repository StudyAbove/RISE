import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { BottomNavBar } from '../components/BottomNavBar';
import { TabBarIcon } from '../components/TabBarIcon';
import { MAIN_TABS } from '../config/mainTabs';
import type { MainTabParamList } from '../types';
import { TAB_PAGE_STACKS } from './TabPageStacks';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Each tab keeps its own stack and mounted screen state.
 * State belongs to this app session; nothing is persisted across restarts.
 */
export function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        popToTopOnBlur: false,
      }}
      tabBar={(props) => <BottomNavBar {...props} />}
    >
      {MAIN_TABS.map(({ name, label, icon }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={TAB_PAGE_STACKS.get(name)!}
          options={{
            tabBarLabel: label,
            tabBarButtonTestID: `nav-tab-${name}`,
            tabBarIcon: ({ focused, color }) => (
              <TabBarIcon icon={icon} focused={focused} color={color} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}