import { ExtensionEmailScreen } from '../../help/screens/ExtensionEmailScreen';
import type { ComponentType } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AssignmentDetailsScreen } from '../../assignments/screens/AssignmentDetailsScreen';
import { ClassWeekScreen } from '../../home/screens/ClassWeekScreen';
import { MAIN_TABS } from '../config/mainTabs';
import type { MainTabParamList, RootStackParamList } from '../types';

type TabPageStackParamList = RootStackParamList & {
  TabMain: undefined;
};

const Stack = createNativeStackNavigator<TabPageStackParamList>();

function createTabPageStack(MainPage: ComponentType) {
  function TabPageStack() {
    return (
      <Stack.Navigator
        initialRouteName="TabMain"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="TabMain" component={MainPage} />
        <Stack.Screen
          name="AssignmentDetails"
          component={AssignmentDetailsScreen}
        />
        <Stack.Screen name="ClassWeek" component={ClassWeekScreen} />
        <Stack.Screen
          name="ExtensionEmail"
          component={ExtensionEmailScreen}
        />
      </Stack.Navigator>
    );
  }

  return TabPageStack;
}

// Create these once, so rerendering never replaces a tab's component.
export const TAB_PAGE_STACKS = new Map<
  keyof MainTabParamList,
  ComponentType
>(
  MAIN_TABS.map(({ name, component }) => [
    name,
    createTabPageStack(component),
  ]),
);