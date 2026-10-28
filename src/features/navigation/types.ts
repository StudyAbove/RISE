import type { NavigatorScreenParams } from '@react-navigation/native';

/** Screens in the bottom tab navigator, in the order they appear in the nav bar. */
export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Study: undefined;
  List: undefined;
  Analytics: undefined;
};

/** Top-level screens controlled by authentication and onboarding state. */
export type RootStackParamList = {
  Welcome: undefined;
  CreateAccount: undefined;
  CheckInbox: { email: string };
  Login: undefined;
  ConnectClasses: undefined;
  ConnectCalendar: undefined;
  OnboardingComplete: { calendarConnected: boolean };
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Settings: undefined;
  AssignmentDetails: { assignmentId: string };
};

// Lets useNavigation() know the app's routes without passing a type each time.
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}