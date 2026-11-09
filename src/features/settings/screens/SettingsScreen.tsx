import {
  Image,
  Linking,
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
  deleteCurrentAccount,
} from '../services/accountDeletionService';

import {
  styles,
} from './SettingsScreen.styles';

const logoutIcon =
  require(
    '../../../../assets/icons/logout.png',
  );

const trashIcon =
  require(
    '../../../../assets/icons/trash.png',
  );

const deleteAccountIcon =
  require(
    '../../../../assets/icons/settings-delete-account.png',
  );

const deleteAccountWarningIcon =
  require(
    '../../../../assets/icons/delete-account-warning.png',
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
    isDisconnectAppleModalVisible,
    setIsDisconnectAppleModalVisible,
  ] =
    useState(false);

  const [
    isAppleDisconnectPending,
    setIsAppleDisconnectPending,
  ] =
    useState(false);

  const [
    isDisconnectGoogleModalVisible,
    setIsDisconnectGoogleModalVisible,
  ] =
    useState(false);


  const [
    isGoogleDisconnectPending,
    setIsGoogleDisconnectPending,
  ] =
    useState(false);

  const [
    isDisconnectingGoogle,
    setIsDisconnectingGoogle,
  ] =
    useState(false);



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

  const [
    isDeleteAccountModalVisible,
    setIsDeleteAccountModalVisible,
  ] =
    useState(false);

  const [
    isDeletingAccount,
    setIsDeletingAccount,
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
      isAppleDisconnectPending
    ) {
      setIsAppleDisconnectPending(
        false,
      );

      setIsDisconnectAppleModalVisible(
        true,
      );

      return;
    }

    if (
      isGoogleDisconnectPending
    ) {
      setIsGoogleDisconnectPending(
        false,
      );

      setIsDisconnectGoogleModalVisible(
        true,
      );

      return;
    }

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

  function handleDisconnectApplePress() {
    setIsAppleDisconnectPending(
      true,
    );

    setIsCalendarModalVisible(
      false,
    );
  }

  function handleCancelDisconnectApple() {
    setIsDisconnectAppleModalVisible(
      false,
    );

    setIsCalendarModalVisible(
      true,
    );
  }

  function handleConfirmDisconnectApple() {
    setIsDisconnectAppleModalVisible(
      false,
    );

    /*
     * Apple Calendar remains connected in RISE until the student
     * actually removes Full Access in iOS Settings.
     *
     * RootNavigator detects that permission change when the app
     * becomes active again and performs the real cleanup.
     */
    void Linking.openSettings();
  }

  function handleDisconnectGooglePress() {
    setIsGoogleDisconnectPending(
      true,
    );

    setIsCalendarModalVisible(
      false,
    );
  }

  function handleCancelDisconnectGoogle() {
    setIsDisconnectGoogleModalVisible(
      false,
    );

    setIsCalendarModalVisible(
      true,
    );
  }

  async function handleConfirmDisconnectGoogle() {
    setIsDisconnectingGoogle(
      true,
    );

    try {
      await disconnectGoogle();

      setIsDisconnectGoogleModalVisible(
        false,
      );

      setIsCalendarModalVisible(
        true,
      );
    } finally {
      setIsDisconnectingGoogle(
        false,
      );
    }
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

  function handleDeleteAccountPress() {
    setIsDeleteAccountModalVisible(
      true,
    );
  }

  function handleCancelDeleteAccount() {
    if (isDeletingAccount) {
      return;
    }

    setIsDeleteAccountModalVisible(
      false,
    );
  }

  async function handleConfirmDeleteAccount() {
    if (isDeletingAccount) {
      return;
    }

    setIsDeletingAccount(
      true,
    );

    try {
      await deleteCurrentAccount();

      /*
       * Successful deletion signs the local Supabase session out.
       * Root-level authentication navigation handles returning the
       * student to the unauthenticated account-entry screen.
       */
      setIsDeleteAccountModalVisible(
        false,
      );
    } catch (error) {
      console.log(
        'Delete account failed:',
        error,
      );
    } finally {
      setIsDeletingAccount(
        false,
      );
    }
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
        <Pressable
          style={({
            pressed,
          }) => [
            styles.logoutCard,
            styles.deleteAccountCard,

            pressed &&
              styles.pressed,
          ]}
          onPress={
            handleDeleteAccountPress
          }
          accessibilityRole="button"
          accessibilityLabel="Delete Account"
        >
          <Image
            source={
              deleteAccountIcon
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
            Delete Account
          </Text>

          <View
            style={
              styles.settingsChevronContainer
            }
          >
            <Image
              source={
                chevronRightIcon
              }
              style={
                styles.settingsChevron
              }
            />
          </View>
        </Pressable>

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
        onDisconnectApple={
          handleDisconnectApplePress
        }
        onDisconnectGoogle={
          handleDisconnectGooglePress
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
          isDisconnectAppleModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          handleCancelDisconnectApple
        }
      >
        <View
          style={
            styles.overlay
          }
        >
          <View
            style={[
              styles.modalCard,
              styles.disconnectModalCard,
            ]}
          >
            <View
              style={
                styles.disconnectIconOuter
              }
            >
              <View
                style={
                  styles.disconnectIconInner
                }
              >
                <Image
                  source={
                    trashIcon
                  }
                  style={
                    styles.disconnectTrashIcon
                  }
                  resizeMode="contain"
                />
              </View>
            </View>

            <Text
              style={
                styles.modalTitle
              }
            >
              Disconnect Apple Calendar?
            </Text>

            <Text
              style={
                styles.modalMessage
              }
            >
              To disconnect, turn off Full Access for RISE in iOS Settings.
            </Text>

            <View
              style={[
                styles.modalActions,
                styles.disconnectModalActions,
              ]}
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
                  handleCancelDisconnectApple
                }
                accessibilityRole="button"
                accessibilityLabel="Cancel Apple Calendar disconnect"
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
                  styles.disconnectConfirmButton,
                  pressed &&
                    styles.pressed,
                ]}
                onPress={
                  handleConfirmDisconnectApple
                }
                accessibilityRole="button"
                accessibilityLabel="Open iOS Settings for Apple Calendar"
              >
                <Text
                  style={
                    styles.disconnectConfirmButtonText
                  }
                >
                  Open Settings
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={
          isDisconnectGoogleModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          handleCancelDisconnectGoogle
        }
      >
        <View
          style={
            styles.overlay
          }
        >
          <View
            style={[
              styles.modalCard,
              styles.disconnectModalCard,
            ]}
          >
            <View
              style={
                styles.disconnectIconOuter
              }
            >
              <View
                style={
                  styles.disconnectIconInner
                }
              >
                <Image
                  source={
                    trashIcon
                  }
                  style={
                    styles.disconnectTrashIcon
                  }
                  resizeMode="contain"
                />
              </View>
            </View>

            <Text
              style={
                styles.modalTitle
              }
            >
              Disconnect Google Calendar?
            </Text>

            <Text
              style={
                styles.modalMessage
              }
            >
              Google-only events will be removed from RISE. Other events will stop syncing with Google.
            </Text>

            <View
              style={[
                styles.modalActions,
                styles.disconnectModalActions,
              ]}
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
                  handleCancelDisconnectGoogle
                }
                disabled={
                  isDisconnectingGoogle
                }
                accessibilityRole="button"
                accessibilityLabel="Cancel Google Calendar disconnect"
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
                  styles.disconnectConfirmButton,
                  pressed &&
                    styles.pressed,
                  isDisconnectingGoogle &&
                    styles.disabledButton,
                ]}
                onPress={
                  handleConfirmDisconnectGoogle
                }
                disabled={
                  isDisconnectingGoogle
                }
                accessibilityRole="button"
                accessibilityLabel="Confirm Google Calendar disconnect"
              >
                <Text
                  style={
                    styles.disconnectConfirmButtonText
                  }
                >
                  {isDisconnectingGoogle
                    ? 'Disconnecting...'
                    : 'Disconnect'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>



      <Modal
        visible={
          isDeleteAccountModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          handleCancelDeleteAccount
        }
      >
        <View
          style={
            styles.overlay
          }
        >
          <View
            style={[
              styles.modalCard,
              styles.logoutModalCard,
            ]}
          >
            <View
              style={
                styles.deleteAccountWarningOuter
              }
            >
              <View
                style={
                  styles.deleteAccountWarningInner
                }
              >
                <Image
                  source={
                    deleteAccountWarningIcon
                  }
                  style={
                    styles.deleteAccountWarningIcon
                  }
                  resizeMode="contain"
                />
              </View>
            </View>

            <Text
              style={
                styles.modalTitle
              }
            >
              Delete Account?
            </Text>

            <Text
              style={
                styles.modalMessage
              }
            >
              This will permanently delete your account and all associated data. This action cannot be undone.
            </Text>

            <View
              style={
                styles.modalActions
              }
            >
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalCancelButton,

                  pressed &&
                    !isDeletingAccount &&
                    styles.pressed,

                  isDeletingAccount &&
                    styles.disabledButton,
                ]}
                onPress={
                  handleCancelDeleteAccount
                }
                disabled={
                  isDeletingAccount
                }
                accessibilityRole="button"
                accessibilityLabel="Cancel account deletion"
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
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.deleteAccountConfirmButton,

                  pressed &&
                    !isDeletingAccount &&
                    styles.pressed,

                  isDeletingAccount &&
                    styles.disabledButton,
                ]}
                onPress={
                  handleConfirmDeleteAccount
                }
                disabled={
                  isDeletingAccount
                }
                accessibilityRole="button"
                accessibilityLabel="Confirm account deletion"
              >
                <Text
                  style={
                    styles.deleteAccountConfirmButtonText
                  }
                >
                  {isDeletingAccount
                    ? 'Deleting...'
                    : 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
            style={[
              styles.modalCard,
              styles.logoutModalCard,
            ]}
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