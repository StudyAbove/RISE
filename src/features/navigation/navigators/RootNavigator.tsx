import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  AppState,
  View,
} from 'react-native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import { AssignmentDetailsScreen } from '../../assignments/screens/AssignmentDetailsScreen';
import CheckInboxScreen from '../../auth/screens/CheckInboxScreen';
import CreateAccountScreen from '../../auth/screens/CreateAccountScreen';
import LoginScreen from '../../auth/screens/LoginScreen';
import WelcomeScreen from '../../auth/screens/WelcomeScreen';
import { ConnectCalendarScreen } from '../../onboarding/screens/ConnectCalendarScreen';
import { ConnectClassesScreen } from '../../onboarding/screens/ConnectClassesScreen';
import { OnboardingCompleteScreen } from '../../onboarding/screens/OnboardingCompleteScreen';

import {
  CalendarSyncSuccessModal,
} from '../../calendar/components/CalendarSyncSuccessModal';

import {
  clearAppleCalendarConnectionPending,
  getLastAppleCalendarAccess,
  isAppleCalendarConnectionPending,
  saveLastAppleCalendarAccess,
} from '../../calendar/services/appleCalendarConnectionStateService';

import {
  startAppleCalendarBackgroundSync,
} from '../../calendar/services/calendarBackgroundSyncService';

import {
  getCalendarConnection,
  saveCalendarConnection,
} from '../../calendar/services/calendarConnectionService';

import {
  getAppleCalendarAccess,
} from '../../calendar/services/calendarService';

import {
  SettingsScreen,
} from '../../settings/screens/SettingsScreen';

import {
  DEV_SKIP_AUTH,
} from '../../../lib/devFlags';

import {
  supabase,
} from '../../../lib/supabase';

import type {
  RootStackParamList,
} from '../types';

import {
  MainTabNavigator,
} from './MainTabNavigator';

const Stack =
  createNativeStackNavigator<
    RootStackParamList
  >();

type RootNavigatorProps = {
  authLinkError?: string;
};

export function RootNavigator({
  authLinkError = '',
}: RootNavigatorProps) {
  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isSignedIn,
    setIsSignedIn,
  ] =
    useState(false);

  const [
    hasCompletedOnboarding,
    setHasCompletedOnboarding,
  ] =
    useState(false);

  /*
   * This global success modal is used only when Expo/iOS
   * restarted RISE during an INITIAL Apple connection.
   *
   * Restoring permission for an already-connected Apple
   * account does not show this popup.
   */
  const [
    showRecoveredAppleSuccess,
    setShowRecoveredAppleSuccess,
  ] =
    useState(false);

  const appleStateCheckInProgressRef =
    useRef(false);

  /*
   * If RootNavigator was created while RISE was already
   * backgrounded, Expo likely restarted the JavaScript
   * bundle while the student was inside iOS Settings.
   *
   * In that case RootNavigator must be able to finish an
   * initial pending Apple connection because the original
   * SettingsScreen no longer exists.
   */
  const mountedWhileInactiveRef =
    useRef(
      AppState.currentState !==
        'active',
    );

  async function loadAuthState() {
    if (DEV_SKIP_AUTH) {
      setIsSignedIn(
        true,
      );

      setHasCompletedOnboarding(
        true,
      );

      setIsLoading(
        false,
      );

      return;
    }

    setIsLoading(
      true,
    );

    const {
      data: {
        session,
      },
    } =
      await supabase.auth.getSession();

    if (!session) {
      setIsSignedIn(
        false,
      );

      setHasCompletedOnboarding(
        false,
      );

      setIsLoading(
        false,
      );

      return;
    }

    /*
     * getSession() restores the session stored on the device, but that
     * session may have been revoked or expired since it was saved.
     *
     * Verify the user with Supabase before allowing access to the
     * authenticated application (#26 AC4).
     */
    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      setIsSignedIn(
        false,
      );

      setHasCompletedOnboarding(
        false,
      );

      setIsLoading(
        false,
      );

      return;
    }

    const {
      data:
        profile,
      error,
    } =
      await supabase
        .from(
          'profiles',
        )
        .select(
          'onboarding_completed',
        )
        .eq(
          'id',
          user.id,
        )
        .maybeSingle();

    if (error) {
      console.log(
        'Could not load onboarding status:',
        error.message,
      );
    }

    setHasCompletedOnboarding(
      profile
        ?.onboarding_completed ??
        false,
    );

    setIsSignedIn(
      true,
    );

    setIsLoading(
      false,
    );
  }

  /**
   * Observes Apple Calendar permission at the application level.
   *
   * There are two intentionally different cases:
   *
   * INITIAL CONNECTION
   * The user started Connect Apple inside RISE and was sent
   * to iOS Settings. If Expo restarted while they were there,
   * RootNavigator finishes the connection and shows the normal
   * one-time connection-success popup.
   *
   * EXISTING CONNECTION RESTORED
   * Apple was already connected in Supabase, permission was
   * removed, and later changed back to Full Access. In this
   * case RISE quietly starts the Apple background sync so any
   * edits made while disconnected can be pushed to Apple.
   */
  async function checkAppleCalendarState(
    allowPendingConnectionRecovery: boolean,
  ) {
    if (
      appleStateCheckInProgressRef.current ||
      !isSignedIn ||
      !hasCompletedOnboarding
    ) {
      return;
    }

    appleStateCheckInProgressRef.current =
      true;

    try {
      const [
        currentAccess,
        previousAccess,
        pendingConnection,
        appleConnection,
      ] =
        await Promise.all([
          getAppleCalendarAccess(),

          getLastAppleCalendarAccess(),

          isAppleCalendarConnectionPending(),

          getCalendarConnection(
            'apple',
          ),
        ]);

      /*
       * Record what iOS reports now before leaving this check.
       *
       * On a future resume, this becomes the "previous" state
       * used to determine whether access was restored.
       */
      await saveLastAppleCalendarAccess(
        currentAccess,
      );

      /*
       * INITIAL CONNECTION RECOVERY
       *
       * If SettingsScreen is still alive, it owns this flow
       * because it needs to dismiss the Calendar connection
       * modal before showing success.
       *
       * RootNavigator only takes ownership when this is a
       * fresh/restarted app instance.
       */
      if (pendingConnection) {
        if (
          !allowPendingConnectionRecovery ||
          currentAccess !==
            'full'
        ) {
          return;
        }

        await saveCalendarConnection(
          'apple',
          null,
        );

        await clearAppleCalendarConnectionPending();

        await saveLastAppleCalendarAccess(
          'full',
        );

        /*
         * Start the initial sync in the background.
         * Do not wait before showing the success popup.
         */
        void startAppleCalendarBackgroundSync()
          .then(
            (result) => {
              console.log(
                'Background Apple Calendar restart-recovery sync complete:',
                result,
              );
            },
          )
          .catch(
            (syncError) => {
              console.log(
                'Background Apple Calendar restart-recovery sync failed:',
                syncError,
              );
            },
          );

        setShowRecoveredAppleSuccess(
          true,
        );

        return;
      }

      /*
       * EXISTING CONNECTION RECONNECTED
       *
       * There must already be an Apple connection saved in
       * Supabase. Full Access by itself never creates a new
       * Apple connection.
       */
      const wasPreviouslyUnavailable =
        previousAccess !==
          null &&
        previousAccess !==
          'full';

      const isFullAccessNow =
        currentAccess ===
        'full';

      const wasAlreadyConnected =
        appleConnection
          ?.connected ===
          true;

      if (
        wasPreviouslyUnavailable &&
        isFullAccessNow &&
        wasAlreadyConnected
      ) {
        /*
         * Permission was restored for an existing connection.
         *
         * Quietly start synchronization. There is intentionally
         * no "Calendar connected!" popup because this is a
         * reconnect, not a brand-new connection.
         */
        void startAppleCalendarBackgroundSync()
          .then(
            (result) => {
              console.log(
                'Background Apple Calendar permission-restored sync complete:',
                result,
              );
            },
          )
          .catch(
            (syncError) => {
              console.log(
                'Background Apple Calendar permission-restored sync failed:',
                syncError,
              );
            },
          );
      }
    } catch (error) {
      console.log(
        'Could not check Apple Calendar connection state:',
        error,
      );
    } finally {
      appleStateCheckInProgressRef.current =
        false;
    }
  }

  useEffect(() => {
    loadAuthState();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        () => {
          loadAuthState();
        },
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Run once after authenticated app state is available.
   *
   * This is useful if the app was freshly launched or Expo
   * restarted the JavaScript bundle while the student was
   * changing permissions.
   */
  useEffect(() => {
    if (
      isLoading ||
      !isSignedIn ||
      !hasCompletedOnboarding
    ) {
      return;
    }

    void checkAppleCalendarState(
      true,
    );
  }, [
    hasCompletedOnboarding,
    isLoading,
    isSignedIn,
  ]);

  /**
   * Observe every return to the foreground.
   *
   * This is what allows a user to restore Apple Full Access
   * directly from iPhone Settings without first navigating
   * through RISE Settings.
   */
  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        'change',
        (
          nextState,
        ) => {
          if (
            nextState !==
            'active'
          ) {
            return;
          }

          /*
           * If RootNavigator originally mounted while RISE was
           * active, SettingsScreen can still own a pending initial
           * connection.
           *
           * If RootNavigator mounted while backgrounded, the old
           * SettingsScreen was lost in an Expo/app restart, so the
           * root is allowed to finish that pending connection.
           *
           * Existing permission-restoration detection runs in both
           * cases.
           */
          void checkAppleCalendarState(
            mountedWhileInactiveRef.current,
          );
        },
      );

    return () => {
      subscription.remove();
    };
  }, [
    hasCompletedOnboarding,
    isSignedIn,
  ]);

  if (isLoading) {
    return (
      <View
        style={{
          flex:
            1,

          alignItems:
            'center',

          justifyContent:
            'center',

          backgroundColor:
            '#FAF8F1',
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Navigator
        screenOptions={{
          headerShown:
            false,
        }}
      >
        {!isSignedIn ? (
          <>
            <Stack.Screen
              name="Welcome"
              component={
                WelcomeScreen
              }
            />

            <Stack.Screen
              name="CreateAccount"
            >
              {() => (
                <CreateAccountScreen
                  authLinkError={
                    authLinkError
                  }
                />
              )}
            </Stack.Screen>

            <Stack.Screen
              name="CheckInbox"
              component={
                CheckInboxScreen
              }
            />

            <Stack.Screen
              name="Login"
            >
              {() => (
                <LoginScreen
                  authLinkError={
                    authLinkError
                  }
                />
              )}
            </Stack.Screen>
          </>
        ) : !hasCompletedOnboarding ? (
          <>
            <Stack.Screen
              name="ConnectClasses"
              component={
                ConnectClassesScreen
              }
            />

            <Stack.Screen
              name="ConnectCalendar"
              component={
                ConnectCalendarScreen
              }
            />

            <Stack.Screen
              name="OnboardingComplete"
            >
              {() => (
                <OnboardingCompleteScreen
                  onComplete={() => {
                    setHasCompletedOnboarding(
                      true,
                    );
                  }}
                />
              )}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={
                MainTabNavigator
              }
            />

            <Stack.Screen
              name="Settings"
              component={
                SettingsScreen
              }
            />
            <Stack.Screen
              name="AssignmentDetails"
              component={AssignmentDetailsScreen}
            />
          </>
        )}
      </Stack.Navigator>

      <CalendarSyncSuccessModal
        visible={
          showRecoveredAppleSuccess
        }
        provider="Apple"
        onDone={() => {
          setShowRecoveredAppleSuccess(
            false,
          );
        }}
      />
    </>
  );
}