import type { NavigatorScreenParams } from '@react-navigation/native';

/** Screens in the bottom tab navigator, in the order they appear in the nav bar. */
export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Study: undefined;
  List: undefined;
  Analytics: undefined;
};

/**
 * Top-level screens. Only one group is registered at a time, based on the
 * user's auth status (see RootNavigator).
 */
export type RootStackParamList = {
  SignIn: undefined;
  CreateAccount: undefined;
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};

// Lets `useNavigation()` know the app's routes without passing a type each time.
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
