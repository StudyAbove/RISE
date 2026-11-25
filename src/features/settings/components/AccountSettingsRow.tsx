import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  useState,
} from 'react';

import SettingsChevronIcon from '../../../../assets/icons/settings-chevron-right.svg';

import {
  type AccountSettings,
  type DisplayNameSource,
  fetchAccountSettings,
  MAX_CUSTOM_DISPLAY_NAME_LENGTH,
  requestEmailChange,
  saveDisplayNamePreference,
  validateCustomDisplayName,
  validateSchoolEmail,
} from '../services/accountSettingsService';

import {
  styles as settingsStyles,
} from '../screens/SettingsScreen.styles';

import {
  colors,
} from '../../../theme/colors';

import {
  fonts,
} from '../../../theme/typography';

function getAccountErrorMessage(
  error: unknown,
): string {
  if (!(error instanceof Error)) {
    return 'Something went wrong. Please try again.';
  }

  switch (error.message) {
    case 'DISPLAY_NAME_REQUIRED':
      return 'Enter a display name.';
    case 'DISPLAY_NAME_TOO_LONG':
      return `Display name must be ${MAX_CUSTOM_DISPLAY_NAME_LENGTH} characters or fewer.`;
    case 'DISPLAY_NAME_INVALID':
      return 'Use a single name with letters, apostrophes, or hyphens.';
    case 'CANVAS_DISPLAY_NAME_UNAVAILABLE':
      return 'Connect Canvas before choosing your Canvas name.';
    case 'EMAIL_REQUIRED':
      return 'Enter your school email.';
    case 'EMAIL_INVALID':
      return 'Enter a valid email address.';
    case 'EMAIL_NOT_SCHOOL':
      return 'A school email ending in .edu is required.';
    case 'EMAIL_ALREADY_REGISTERED':
      return 'That school email is already connected to another RISE account.';
    default:
      if (
        error.message
          .toLowerCase()
          .includes('rate limit')
      ) {
        return 'Too many email requests were made. Please wait a few minutes and try again.';
      }

      return 'Something went wrong. Please try again.';
  }
}

import Svg, {
  Path,
} from 'react-native-svg';

function AccountIcon({
  inModal = false,
}: {
  inModal?: boolean;
}) {
  const size = inModal ? 22 : 24;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 21 21"
      style={
        inModal
          ? localStyles.modalAccountIcon
          : localStyles.accountIcon
      }
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Path
        fill="#424758"
        fillRule="evenodd"
        d="M13.5 5.25C13.5 6.04565 13.183929 6.808711 12.62132 7.37132C12.058711 7.93393 11.295649 8.25 10.5 8.25C9.704351 8.25 8.941289 7.93393 8.37868 7.37132C7.81607 6.808711 7.5 6.04565 7.5 5.25C7.5 4.454351 7.81607 3.691289 8.37868 3.12868C8.941289 2.56607 9.704351 2.25 10.5 2.25C11.295649 2.25 12.058711 2.56607 12.62132 3.12868C13.183929 3.691289 13.5 4.454351 13.5 5.25ZM15.75 5.25C15.75 6.642387 15.196876 7.977744 14.21231 8.96231C13.227744 9.946876 11.892387 10.5 10.5 10.5C9.107613 10.5 7.772256 9.946876 6.78769 8.96231C5.803124 7.977744 5.25 6.642387 5.25 5.25C5.25 3.857613 5.803124 2.522255 6.78769 1.537689C7.772256 0.553123 9.107613 0 10.5 0C11.892387 0 13.227744 0.553123 14.21231 1.537689C15.196876 2.522255 15.75 3.857613 15.75 5.25ZM2.25 17.25C2.25 16.944 2.58 16.036501 4.23 15.061501C5.757 14.160001 7.98 13.5 10.5 13.5C13.02 13.5 15.243 14.160001 16.77 15.061501C18.42 16.036501 18.75 16.944 18.75 17.25C18.75 17.647825 18.591964 18.029355 18.31066 18.31066C18.029355 18.591964 17.647825 18.75 17.25 18.75H3.75C3.352175 18.75 2.970644 18.591964 2.68934 18.31066C2.408035 18.029355 2.25 17.647825 2.25 17.25ZM10.5 11.25C4.725 11.25 0 14.25 0 17.25C0 18.244562 0.395088 19.198389 1.09835 19.90165C1.801611 20.604912 2.755438 21 3.75 21H17.25C18.244562 21 19.198389 20.604912 19.90165 19.90165C20.604912 19.198389 21 18.244562 21 17.25C21 14.25 16.275 11.25 10.5 11.25Z"
      />
    </Svg>
  );
}

function getFirstName(
  value: string | null | undefined,
): string {
  return value?.trim().split(/\s+/)[0] ?? '';
}

export function AccountSettingsRow() {
  const [
    isVisible,
    setIsVisible,
  ] =
    useState(false);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    account,
    setAccount,
  ] =
    useState<AccountSettings | null>(
      null,
    );

  const [
    source,
    setSource,
  ] =
    useState<DisplayNameSource>(
      'canvas',
    );

  const [
    customName,
    setCustomName,
  ] =
    useState('');

  const [
    email,
    setEmail,
  ] =
    useState('');

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState('');

  async function handleOpen() {
    setIsVisible(true);
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const loaded =
        await fetchAccountSettings();

      setAccount(loaded);

      const hasCanvasName =
        Boolean(
          loaded.canvasDisplayName?.trim(),
        );

      const initialSource:
        DisplayNameSource =
        hasCanvasName
          ? loaded.displayNameSource
          : 'custom';

      setSource(initialSource);

      setCustomName(
        loaded.customDisplayName ??
          (hasCanvasName
            ? getFirstName(
                loaded.canvasDisplayName ??
                  loaded.displayName,
              )
            : 'Student'),
      );

      setEmail(loaded.email);
    } catch (loadError) {
      setError(
        getAccountErrorMessage(
          loadError,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    if (isSaving) {
      return;
    }

    setIsVisible(false);
    setError('');
    setSuccessMessage('');
  }

  async function handleConfirm() {
    if (!account || isSaving) {
      return;
    }

    setError('');
    setSuccessMessage('');

    try {
      if (source === 'custom') {
        validateCustomDisplayName(
          customName,
        );
      }

      validateSchoolEmail(email);

      setIsSaving(true);

      const savedDisplayName =
        await saveDisplayNamePreference(
          source,
          source === 'custom'
            ? customName
            : undefined,
        );

      const emailResult =
        await requestEmailChange(
          email,
        );

      setAccount((current) =>
        current
          ? {
              ...current,
              displayName:
                savedDisplayName,
              customDisplayName:
                source === 'custom'
                  ? savedDisplayName
                  : current.customDisplayName,
              displayNameSource:
                source,
            }
          : current,
      );

      if (emailResult.changed) {
        setEmail(emailResult.email);

        setSuccessMessage(
          'Display name saved. Check your email for the confirmation link. Your account email stays unchanged until verification is complete.',
        );

        return;
      }

      setIsVisible(false);
    } catch (saveError) {
      setError(
        getAccountErrorMessage(
          saveError,
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  const canvasName =
    account?.canvasDisplayName ??
    '';

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          settingsStyles.logoutCard,
          localStyles.accountCard,
          pressed &&
            settingsStyles.pressed,
        ]}
        onPress={() => {
          void handleOpen();
        }}
        accessibilityRole="button"
        accessibilityLabel="Account"
      >
        <AccountIcon />

        <Text
          style={[
            settingsStyles.logoutText,
            localStyles.rowText,
          ]}
        >
          Account
        </Text>

        <View
          style={
            settingsStyles.settingsChevronContainer
          }
        >
          <SettingsChevronIcon
            width={24}
            height={24}
          />
        </View>
      </Pressable>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={
          handleClose
        }
      >
        <View
          style={
            localStyles.overlay
          }
        >
          <View
            style={
              localStyles.modalCard
            }
          >
            <View
              style={
                localStyles.modalIconOuter
              }
            >
              <View
                style={
                  localStyles.modalIconInner
                }
              >
                <AccountIcon inModal />
              </View>
            </View>

            <Text
              accessibilityRole="header"
              style={
                localStyles.modalTitle
              }
            >
              Account Settings
            </Text>

            <Text
              style={
                localStyles.modalMessage
              }
            >
              Update your display name and school email below.
            </Text>

            {isLoading ? (
              <View
                style={
                  localStyles.loadingContainer
                }
              >
                <ActivityIndicator />

                <Text
                  style={
                    localStyles.loadingText
                  }
                >
                  Loading account…
                </Text>
              </View>
            ) : (
              <>
                <View
                  style={
                    localStyles.form
                  }
                >
                  <Text
                    style={
                      localStyles.label
                    }
                  >
                    Name
                  </Text>

                  <TextInput
                    value={
                      source === 'canvas'
                        ? getFirstName(
                            canvasName,
                          )
                        : customName
                    }
                    onChangeText={
                      setCustomName
                    }
                    editable={
                      source === 'custom' &&
                      !isSaving
                    }
                    maxLength={
                      MAX_CUSTOM_DISPLAY_NAME_LENGTH
                    }
                    autoCapitalize="words"
                    autoCorrect={false}
                    placeholder={
                      getFirstName(
                        canvasName,
                      ) ||
                      'Enter your name'
                    }
                    placeholderTextColor="#9A9A9A"
                    style={[
                      localStyles.input,
                      source === 'canvas' &&
                        localStyles.readOnlyInput,
                    ]}
                    accessibilityLabel="Display name"
                  />

                  <View
                    style={
                      localStyles.nameSourceRow
                    }
                  >
                    <Pressable
                      style={
                        localStyles.nameSourceChoice
                      }
                      disabled={
                        !canvasName ||
                        isSaving
                      }
                      onPress={() =>
                        setSource(
                          'canvas',
                        )
                      }
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked:
                          source ===
                          'canvas',
                        disabled:
                          !canvasName,
                      }}
                      accessibilityLabel="Use Canvas name"
                    >
                      <View
                        style={[
                          localStyles.radioOuter,
                          source ===
                            'canvas' &&
                            localStyles.radioOuterSelected,
                        ]}
                      >
                        {source ===
                          'canvas' && (
                          <View
                            style={
                              localStyles.radioInner
                            }
                          />
                        )}
                      </View>

                      <Text
                        style={[
                          localStyles.nameSourceText,
                          !canvasName &&
                            localStyles.nameSourceTextDisabled,
                        ]}
                      >
                        Canvas Name
                      </Text>
                    </Pressable>

                    <Pressable
                      style={
                        localStyles.nameSourceChoice
                      }
                      disabled={
                        isSaving
                      }
                      onPress={() =>
                        setSource(
                          'custom',
                        )
                      }
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked:
                          source ===
                          'custom',
                      }}
                      accessibilityLabel="Use custom name"
                    >
                      <View
                        style={[
                          localStyles.radioOuter,
                          source ===
                            'custom' &&
                            localStyles.radioOuterSelected,
                        ]}
                      >
                        {source ===
                          'custom' && (
                          <View
                            style={
                              localStyles.radioInner
                            }
                          />
                        )}
                      </View>

                      <Text
                        style={
                          localStyles.nameSourceText
                        }
                      >
                        Custom Name
                      </Text>
                    </Pressable>
                  </View>

                  <Text
                    style={[
                      localStyles.label,
                      localStyles.emailLabel,
                    ]}
                  >
                    School email
                  </Text>

                  <TextInput
                    value={email}
                    onChangeText={
                      setEmail
                    }
                    editable={
                      !isSaving
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    placeholder="student@school.edu"
                    placeholderTextColor="#9A9A9A"
                    style={
                      localStyles.input
                    }
                    accessibilityLabel="School email"
                  />

                  <Text
                    style={
                      localStyles.emailHint
                    }
                  >
                    Changing your email requires verification before it becomes your account email.
                  </Text>
                </View>

                {!!error && (
                  <Text
                    accessibilityRole="alert"
                    style={
                      localStyles.errorText
                    }
                  >
                    {error}
                  </Text>
                )}

                {!!successMessage && (
                  <Text
                    style={
                      localStyles.successText
                    }
                  >
                    {successMessage}
                  </Text>
                )}

                <View
                  style={
                    localStyles.actions
                  }
                >
                  <Pressable
                    style={({ pressed }) => [
                      localStyles.button,
                      localStyles.cancelButton,
                      pressed &&
                        settingsStyles.pressed,
                      isSaving &&
                        settingsStyles.disabledButton,
                    ]}
                    disabled={
                      isSaving
                    }
                    onPress={
                      handleClose
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Cancel account settings"
                  >
                    <Text
                      style={
                        localStyles.cancelButtonText
                      }
                    >
                      Cancel
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      localStyles.button,
                      localStyles.confirmButton,
                      pressed &&
                        settingsStyles.pressed,
                      (
                        isSaving ||
                        isLoading ||
                        !account
                      ) &&
                        settingsStyles.disabledButton,
                    ]}
                    disabled={
                      isSaving ||
                      isLoading ||
                      !account
                    }
                    onPress={() => {
                      void handleConfirm();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Confirm account settings"
                  >
                    {isSaving ? (
                      <ActivityIndicator
                        size="small"
                      />
                    ) : (
                      <Text
                        style={
                          localStyles.confirmButtonText
                        }
                      >
                        Confirm
                      </Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const localStyles =
  StyleSheet.create({
    accountCard: {
      marginBottom: 16,
    },

    rowText: {
      flex: 1,
    },

    accountIcon: {
      width: 24,
      height: 24,
      marginRight: 18,
    },

    modalAccountIcon: {
      width: 22,
      height: 22,
    },

    overlay: {
      flex: 1,
      backgroundColor:
        'rgba(0, 0, 0, 0.22)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },

    modalCard: {
      width: 340,
      maxWidth: '100%',
      borderRadius: 16,
      backgroundColor:
        colors.softWhite,
      paddingTop: 22,
      paddingHorizontal: 24,
      paddingBottom: 24,
      alignItems: 'center',

      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 6,
    },

    modalIconOuter: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor:
        'rgba(120, 146, 123, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    modalIconInner: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        'rgba(120, 146, 123, 0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    modalTitle: {
      marginTop: 12,
      fontFamily:
        fonts.heading.bold,
      fontSize: 20,
      lineHeight: 27,
      color: '#000000',
      textAlign: 'center',
    },

    modalMessage: {
      width: 276,
      marginTop: 8,
      fontFamily:
        fonts.body.medium,
      fontSize: 14,
      lineHeight: 19,
      color: '#71717B',
      textAlign: 'center',
    },

    loadingContainer: {
      minHeight: 180,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },

    loadingText: {
      fontFamily:
        fonts.body.medium,
      fontSize: 14,
      color: '#71717B',
    },

    form: {
      width: '100%',
      marginTop: 18,
    },

    label: {
      fontFamily:
        fonts.heading.semiBold,
      fontSize: 14,
      color: '#424758',
      marginBottom: 8,
    },

    nameSourceRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
      marginTop: 2,
      marginBottom: 16,
    },

    nameSourceChoice: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    nameSourceText: {
      fontFamily:
        fonts.body.medium,
      fontSize: 13,
      color: '#424758',
    },

    nameSourceTextDisabled: {
      color: '#A4AAA5',
    },

    radioOuter: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: '#949A95',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 7,
    },

    radioOuterSelected: {
      borderColor:
        colors.deepOlive,
    },

    radioInner: {
      width: 9,
      height: 9,
      borderRadius: 4.5,
      backgroundColor:
        colors.deepOlive,
    },

    input: {
      width: '100%',
      height: 44,
      borderWidth: 1,
      borderColor: '#C8CEC9',
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 12,
      fontFamily:
        fonts.body.medium,
      fontSize: 14,
      color: '#242424',
      marginBottom: 10,
    },

    readOnlyInput: {
      backgroundColor: '#F2F3F1',
      color: '#777D78',
    },

    emailLabel: {
      marginTop: 6,
    },

    emailHint: {
      fontFamily:
        fonts.body.medium,
      fontSize: 11,
      lineHeight: 15,
      color: '#71717B',
    },

    errorText: {
      width: '100%',
      marginTop: 12,
      fontFamily:
        fonts.body.medium,
      fontSize: 12,
      lineHeight: 16,
      color: '#B42318',
      textAlign: 'center',
    },

    successText: {
      width: '100%',
      marginTop: 12,
      fontFamily:
        fonts.body.medium,
      fontSize: 12,
      lineHeight: 16,
      color: colors.deepOlive,
      textAlign: 'center',
    },

    actions: {
      width: '100%',
      flexDirection: 'row',
      gap: 8,
      marginTop: 18,
    },

    button: {
      flex: 1,
      height: 40,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cancelButton: {
      backgroundColor: '#000000',
    },

    confirmButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: '#000000',
    },

    cancelButtonText: {
      fontFamily:
        fonts.heading.bold,
      fontSize: 15,
      color: '#FFFFFF',
    },

    confirmButtonText: {
      fontFamily:
        fonts.heading.bold,
      fontSize: 15,
      color: '#000000',
    },
  });
