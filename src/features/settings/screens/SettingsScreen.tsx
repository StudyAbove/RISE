import {
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  useState,
} from 'react';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import WarningIcon from '../../../../assets/icons/warning.svg';

import {
  BackButton,
} from '../../../components/BackButton';
import { CanvasSettingsRow } from '../../canvas/components/CanvasSettingsRow';

import {
  CalendarConnectionModal,
} from '../../calendar/components/CalendarConnectionModal';

import {
  CalendarSyncSuccessModal,
} from '../../calendar/components/CalendarSyncSuccessModal';

import {
  type CalendarProviderName,
  useCalendarConnection,
} from '../../calendar/hooks/useCalendarConnection';

import {
  supabase,
} from '../../../lib/supabase';

import {
  styles,
} from './SettingsScreen.styles';

const logoutIcon =
  require(
    '../../../../assets/icons/logout.png',
  );

const calendarIcon =
  require(
    '../../../../assets/icons/calendar.png',
  );

const chevronRightIcon =
  require(
    '../../../../assets/icons/chevron-right.png',
  );

export function SettingsScreen() {
  const insets =
    useSafeAreaInsets();

  const [
    isCalendarModalVisible,
    setIsCalendarModalVisible,
  ] =
    useState(false);

  const [
    isSuccessModalVisible,
    setIsSuccessModalVisible,
  ] =
    useState(false);

  const [
    successProvider,
    setSuccessProvider,
  ] =
    useState<
      CalendarProviderName
    >('Apple');

  const [
    pendingSuccessProvider,
    setPendingSuccessProvider,
  ] =
    useState<
      CalendarProviderName | null
    >(null);

  const [
    isLogoutModalVisible,
    setIsLogoutModalVisible,
  ] =
    useState(false);

  const [
    isLoggingOut,
    setIsLoggingOut,
  ] =
    useState(false);

  const {
    appleConnected,
    googleConnected,
    googleEmail,
    isConnectingApple,
    isConnectingGoogle,
    connectApple,
    connectGoogle,
    disconnectGoogle,
  } =
    useCalendarConnection({
      /*
       * The connection modal is still open. Close it first.
       * Its onDismiss callback shows the success popup
       * exactly once.
       */
      onConnected:
        (provider) => {
          setPendingSuccessProvider(
            provider,
          );

          setIsCalendarModalVisible(
            false,
          );
        },
    });

  function handleCalendarPress() {
    setIsCalendarModalVisible(
      true,
    );
  }

  function handleCloseCalendarModal() {
    setPendingSuccessProvider(
      null,
    );

    setIsCalendarModalVisible(
      false,
    );
  }

  function handleCalendarModalDismiss() {
    if (
      !pendingSuccessProvider
    ) {
      return;
    }

    setSuccessProvider(
      pendingSuccessProvider,
    );

    setPendingSuccessProvider(
      null,
    );

    setIsSuccessModalVisible(
      true,
    );
  }

  function handleSuccessDone() {
    setIsSuccessModalVisible(
      false,
    );
  }

  function handleLogoutPress() {
    setIsLogoutModalVisible(
      true,
    );
  }

  function handleCancelLogout() {
    setIsLogoutModalVisible(
      false,
    );
  }

  async function handleConfirmLogout() {
    setIsLoggingOut(
      true,
    );

    const {
      error,
    } =
      await supabase.auth.signOut();

    if (error) {
      console.log(
        'Logout failed:',
        error.message,
      );

      setIsLoggingOut(
        false,
      );

      return;
    }

    setIsLogoutModalVisible(
      false,
    );

    setIsLoggingOut(
      false,
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop:
            insets.top,

          paddingBottom:
            insets.bottom,
        },
      ]}
    >
      <View
        style={
          styles.header
        }
      >
        <BackButton />

        <Text
          accessibilityRole="header"
          style={
            styles.title
          }
        >
          Settings
        </Text>

        <View
          style={
            styles.headerSpacer
          }
        />
      </View>

      <View
        style={
          styles.content
        }
      >
        <View
          style={[
            styles.logoutCard,
            {
              marginBottom:
                16,
            },
          ]}
        >
          <Image
            source={
              calendarIcon
            }
            style={
              styles.logoutIcon
            }
          />

          <Text
            style={[
              styles.logoutText,
              {
                flex:
                  1,
              },
            ]}
          >
            Calendar
          </Text>

          <Pressable
            onPress={
              handleCalendarPress
            }
            style={({
              pressed,
            }) => [
              {
                width:
                  44,

                height:
                  44,

                alignItems:
                  'center',

                justifyContent:
                  'center',
              },

              pressed &&
                styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open calendar settings"
          >
            <Image
              source={
                chevronRightIcon
              }
              style={{
                width:
                  24,

                height:
                  24,

                resizeMode:
                  'contain',
              }}
            />
          </Pressable>
        </View>

        <CanvasSettingsRow />

        <Pressable
          style={({
            pressed,
          }) => [
            styles.logoutCard,

            pressed &&
              styles.pressed,
          ]}
          onPress={
            handleLogoutPress
          }
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <Image
            source={
              logoutIcon
            }
            style={
              styles.logoutIcon
            }
          />

          <Text
            style={
              styles.logoutText
            }
          >
            Logout
          </Text>
        </Pressable>
      </View>

      <CalendarConnectionModal
        visible={
          isCalendarModalVisible
        }
        appleConnected={
          appleConnected
        }
        googleConnected={
          googleConnected
        }
        googleEmail={
          googleEmail
        }
        isConnectingApple={
          isConnectingApple
        }
        isConnectingGoogle={
          isConnectingGoogle
        }
        onClose={
          handleCloseCalendarModal
        }
        onDismiss={
          handleCalendarModalDismiss
        }
        onConnectApple={
          connectApple
        }
        onConnectGoogle={
          connectGoogle
        }
        onDisconnectGoogle={
          disconnectGoogle
        }
      />

      <CalendarSyncSuccessModal
        visible={
          isSuccessModalVisible
        }
        provider={
          successProvider
        }
        onDone={
          handleSuccessDone
        }
      />

      <Modal
        visible={
          isLogoutModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          handleCancelLogout
        }
      >
        <View
          style={
            styles.overlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <View
              style={
                styles.warningIconOuter
              }
            >
              <View
                style={
                  styles.warningIconInner
                }
              >
                <WarningIcon
                  width={
                    22
                  }
                  height={
                    22
                  }
                />
              </View>
            </View>

            <Text
              style={
                styles.modalTitle
              }
            >
              Oh no! You’re leaving...
            </Text>

            <Text
              style={
                styles.modalMessage
              }
            >
              Are you sure you want to logout?
            </Text>

            <View
              style={
                styles.modalActions
              }
            >
              <Pressable
                style={({
                  pressed,
                }) => [
                  styles.modalButton,

                  styles.modalCancelButton,

                  pressed &&
                    styles.pressed,
                ]}
                onPress={
                  handleCancelLogout
                }
                disabled={
                  isLoggingOut
                }
                accessibilityRole="button"
                accessibilityLabel="Cancel logout"
              >
                <Text
                  style={
                    styles.modalCancelButtonText
                  }
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={({
                  pressed,
                }) => [
                  styles.modalButton,

                  styles.modalLogoutButton,

                  pressed &&
                    styles.pressed,

                  isLoggingOut &&
                    styles.disabledButton,
                ]}
                onPress={
                  handleConfirmLogout
                }
                disabled={
                  isLoggingOut
                }
                accessibilityRole="button"
                accessibilityLabel="Confirm logout"
              >
                <Text
                  style={
                    styles.modalLogoutButtonText
                  }
                >
                  {isLoggingOut
                    ? 'Logging out...'
                    : 'Logout'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}