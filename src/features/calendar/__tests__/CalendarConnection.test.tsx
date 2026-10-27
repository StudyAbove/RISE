import React from 'react';

import {
  Alert,
  AppState,
  Linking,
} from 'react-native';

import {
  act,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';

import {
  SettingsScreen,
} from '../../settings/screens/SettingsScreen';

const mockGetAppleCalendarAccess =
  jest.fn();

const mockRequestAppleCalendarFullAccess =
  jest.fn();

const mockStartAppleCalendarBackgroundSync =
  jest.fn();

const mockStartGoogleCalendarBackgroundSync =
  jest.fn();

const mockGetCalendarConnection =
  jest.fn();

const mockSaveCalendarConnection =
  jest.fn();

const mockClearAppleCalendarConnectionPending =
  jest.fn();

const mockIsAppleCalendarConnectionPending =
  jest.fn();

const mockMarkAppleCalendarConnectionPending =
  jest.fn();

const mockSaveLastAppleCalendarAccess =
  jest.fn();

const mockGetGoogleUserInfo =
  jest.fn();

const mockHasGoogleCalendarAccess =
  jest.fn();

const mockPromptGoogleAsync =
  jest.fn();


const mockDisconnectGoogleCalendarWithCleanup =
  jest.fn();

let mockGoogleResponse: any =
  null;

let mockAppStateChangeHandler:
  | ((
      state: string,
    ) => void)
  | null =
  null;

type SettingsRenderResult =
  Awaited<
    ReturnType<
      typeof render
    >
  >;

jest.mock(
  'expo-calendar',
  () => ({}),
);

jest.mock(
  'expo-web-browser',
  () => ({
    maybeCompleteAuthSession:
      jest.fn(),
  }),
);

jest.mock(
  'expo-auth-session/providers/google',
  () => ({
    useAuthRequest: () => [
      {
        redirectUri:
          'com.anonymous.rise:/oauthredirect',
      },

      mockGoogleResponse,

      mockPromptGoogleAsync,
    ],
  }),
);

jest.mock(
  '../services/calendarBackgroundSyncService',
  () => ({
    startAppleCalendarBackgroundSync:
      (...args: unknown[]) =>
        mockStartAppleCalendarBackgroundSync(
          ...args,
        ),

    startGoogleCalendarBackgroundSync:
      (...args: unknown[]) =>
        mockStartGoogleCalendarBackgroundSync(
          ...args,
        ),
  }),
);

jest.mock(
  '../services/calendarService',
  () => ({
    getAppleCalendarAccess:
      (...args: unknown[]) =>
        mockGetAppleCalendarAccess(
          ...args,
        ),

    requestAppleCalendarFullAccess:
      (...args: unknown[]) =>
        mockRequestAppleCalendarFullAccess(
          ...args,
        ),
  }),
);

jest.mock(
  '../services/calendarConnectionService',
  () => ({
    getCalendarConnection:
      (...args: unknown[]) =>
        mockGetCalendarConnection(
          ...args,
        ),

    saveCalendarConnection:
      (...args: unknown[]) =>
        mockSaveCalendarConnection(
          ...args,
        ),

    deleteCalendarConnection:
      jest.fn(),
  }),
);

jest.mock(
  '../services/appleCalendarConnectionStateService',
  () => ({
    clearAppleCalendarConnectionPending:
      (...args: unknown[]) =>
        mockClearAppleCalendarConnectionPending(
          ...args,
        ),

    isAppleCalendarConnectionPending:
      (...args: unknown[]) =>
        mockIsAppleCalendarConnectionPending(
          ...args,
        ),

    markAppleCalendarConnectionPending:
      (...args: unknown[]) =>
        mockMarkAppleCalendarConnectionPending(
          ...args,
        ),

    saveLastAppleCalendarAccess:
      (...args: unknown[]) =>
        mockSaveLastAppleCalendarAccess(
          ...args,
        ),
  }),
);

jest.mock(
  '../services/googleCalendarService',
  () => ({
    getGoogleUserInfo:
      (...args: unknown[]) =>
        mockGetGoogleUserInfo(
          ...args,
        ),

    hasGoogleCalendarAccess:
      (...args: unknown[]) =>
        mockHasGoogleCalendarAccess(
          ...args,
        ),
  }),
);

jest.mock(
  '../services/googleCalendarDisconnectService',
  () => ({
    disconnectGoogleCalendarWithCleanup:
      (...args: unknown[]) =>
        mockDisconnectGoogleCalendarWithCleanup(
          ...args,
        ),
  }),
);

jest.mock(
  '../services/googleTokenService',
  () => ({
    saveGoogleAccessToken:
      jest
        .fn()
        .mockResolvedValue(
          undefined,
        ),

    clearGoogleAccessToken:
      jest
        .fn()
        .mockResolvedValue(
          undefined,
        ),
  }),
);

jest.mock(
  '../../../lib/supabase',
  () => ({
    supabase: {
      auth: {
        signOut:
          jest
            .fn()
            .mockResolvedValue({
              error:
                null,
            }),
      },
    },
  }),
);

jest.mock(
  '../../../components/BackButton',
  () => {
    const {
      View,
    } =
      require(
        'react-native',
      );

    return {
      BackButton: () => (
        <View />
      ),
    };
  },
);

jest.mock(
  'react-native-safe-area-context',
  () => ({
    useSafeAreaInsets:
      () => ({
        top:
          0,

        bottom:
          0,

        left:
          0,

        right:
          0,
      }),
  }),
);

jest.mock(
  '../components/CalendarConnectionModal',
  () => {
    const ReactModule =
      require(
        'react',
      );

    const {
      Pressable,
      Text,
      View,
    } =
      require(
        'react-native',
      );

    return {
      CalendarConnectionModal: ({
        visible,
        appleConnected,
        googleConnected,
        googleEmail,
        onConnectApple,
        onConnectGoogle,
        onDisconnectGoogle,
        onDismiss,
      }: any) => {
        const previousVisibleRef =
          ReactModule.useRef(
            visible,
          );

        ReactModule.useEffect(
          () => {
            const wasVisible =
              previousVisibleRef.current;

            if (
              wasVisible &&
              !visible
            ) {
              onDismiss?.();
            }

            previousVisibleRef.current =
              visible;
          },
          [
            visible,
            onDismiss,
          ],
        );

        if (!visible) {
          return null;
        }

        return (
          <View>
            <Text>
              Calendar Connection Modal
            </Text>

            {appleConnected ? (
              <Text>
                Apple Calendar connected
              </Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Connect Apple Calendar"
                onPress={
                  onConnectApple
                }
              >
                <Text>
                  Connect Apple Calendar
                </Text>
              </Pressable>
            )}

            {googleConnected ? (
              <View>
                <Text>
                  Google Calendar connected
                </Text>

                {googleEmail ? (
                  <Text>
                    {googleEmail}
                  </Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Disconnect Google Calendar"
                  onPress={
                    onDisconnectGoogle
                  }
                >
                  <Text>
                    Disconnect Google Calendar
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Connect Google Calendar"
                onPress={
                  onConnectGoogle
                }
              >
                <Text>
                  Connect Google Calendar
                </Text>
              </Pressable>
            )}
          </View>
        );
      },
    };
  },
);

jest.mock(
  '../components/CalendarSyncSuccessModal',
  () => {
    const {
      Pressable,
      Text,
      View,
    } =
      require(
        'react-native',
      );

    return {
      CalendarSyncSuccessModal: ({
        visible,
        provider,
        onDone,
      }: any) => {
        if (!visible) {
          return null;
        }

        const providerName =
          provider ===
          'Apple'
            ? 'Apple Calendar'
            : 'Google Calendar';

        return (
          <View>
            <Text>
              Calendar connected!
            </Text>

            <Text>
              {providerName} is connected. Your events are syncing in the background.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done"
              onPress={
                onDone
              }
            >
              <Text>
                Done
              </Text>
            </Pressable>
          </View>
        );
      },
    };
  },
);

function setDefaultConnectionMocks() {
  mockDisconnectGoogleCalendarWithCleanup.mockResolvedValue(
    undefined,
  );

  mockClearAppleCalendarConnectionPending.mockResolvedValue(
    undefined,
  );

  mockIsAppleCalendarConnectionPending.mockResolvedValue(
    false,
  );

  mockMarkAppleCalendarConnectionPending.mockResolvedValue(
    undefined,
  );

  mockSaveLastAppleCalendarAccess.mockResolvedValue(
    undefined,
  );

  mockGetAppleCalendarAccess.mockResolvedValue(
    'denied',
  );

  mockGetCalendarConnection.mockImplementation(
    async () =>
      null,
  );

  mockRequestAppleCalendarFullAccess.mockResolvedValue(
    {
      status:
        'granted',
    },
  );

  mockSaveCalendarConnection.mockResolvedValue(
    undefined,
  );

  mockStartAppleCalendarBackgroundSync.mockResolvedValue(
    {
      imported:
        0,

      skipped:
        0,

      failed:
        0,

      total:
        0,
    },
  );

  mockStartGoogleCalendarBackgroundSync.mockResolvedValue(
    {
      imported:
        0,

      skipped:
        0,

      failed:
        0,

      total:
        0,
    },
  );

  mockHasGoogleCalendarAccess.mockResolvedValue(
    true,
  );

  mockGetGoogleUserInfo.mockResolvedValue(
    {
      email:
        'student@gmail.com',
    },
  );

  mockPromptGoogleAsync.mockResolvedValue(
    {
      type:
        'success',
    },
  );
}

async function renderSettings():
  Promise<SettingsRenderResult> {
  const utils =
    await render(
      <SettingsScreen />,
    );

  await waitFor(() => {
    expect(
      utils.getByRole(
        'header',
        {
          name:
            'Settings',
        },
      ),
    ).toBeOnTheScreen();
  });

  return utils;
}

async function openCalendarSettings(
  utils: SettingsRenderResult,
) {
  fireEvent.press(
    utils.getByRole(
      'button',
      {
        name:
          'Open calendar settings',
      },
    ),
  );

  await waitFor(() => {
    expect(
      utils.getByText(
        'Calendar Connection Modal',
      ),
    ).toBeOnTheScreen();
  });
}

describe(
  'Calendar connection',
  () => {
    beforeEach(() => {
      jest.clearAllMocks();

      mockGoogleResponse =
        null;

      setDefaultConnectionMocks();

      mockAppStateChangeHandler =
        null;

      jest
        .spyOn(
          AppState,
          'addEventListener',
        )
        .mockImplementation(
          (
            _eventType,
            handler,
          ) => {
            mockAppStateChangeHandler =
              handler as (
                state: string,
              ) => void;

            return {
              remove:
                jest.fn(),
            } as any;
          },
        );

      jest
        .spyOn(
          Alert,
          'alert',
        )
        .mockImplementation(
          () => {},
        );

      jest
        .spyOn(
          Linking,
          'openSettings',
        )
        .mockResolvedValue();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it(
      'shows Apple and Google connection options when Calendar settings opens',
      async () => {
        const utils =
          await renderSettings();

        await openCalendarSettings(
          utils,
        );

        expect(
          utils.getByRole(
            'button',
            {
              name:
                'Connect Apple Calendar',
            },
          ),
        ).toBeOnTheScreen();

        expect(
          utils.getByRole(
            'button',
            {
              name:
                'Connect Google Calendar',
            },
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'recognizes previously connected Apple and Google calendars',
      async () => {
        mockGetAppleCalendarAccess.mockResolvedValue(
          'full',
        );

        mockGetCalendarConnection.mockImplementation(
          async (
            provider: string,
          ) => {
            if (
              provider ===
              'apple'
            ) {
              return {
                provider:
                  'apple',

                provider_email:
                  null,

                connected:
                  true,
              };
            }

            if (
              provider ===
              'google'
            ) {
              return {
                provider:
                  'google',

                provider_email:
                  'student@gmail.com',

                connected:
                  true,
              };
            }

            return null;
          },
        );

        const utils =
          await renderSettings();

        await waitFor(() => {
          expect(
            mockGetCalendarConnection,
          ).toHaveBeenCalledWith(
            'apple',
          );

          expect(
            mockGetCalendarConnection,
          ).toHaveBeenCalledWith(
            'google',
          );
        });

        await openCalendarSettings(
          utils,
        );

        expect(
          utils.getByText(
            'Apple Calendar connected',
          ),
        ).toBeOnTheScreen();

        expect(
          utils.getByText(
            'Google Calendar connected',
          ),
        ).toBeOnTheScreen();

        expect(
          utils.getByText(
            'student@gmail.com',
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'recognizes restored Apple Full Access without starting a duplicate Settings sync',
      async () => {
        let appleAccess:
          'denied' | 'full' =
          'denied';

        mockGetAppleCalendarAccess.mockImplementation(
          async () =>
            appleAccess,
        );

        mockGetCalendarConnection.mockImplementation(
          async (
            provider: string,
          ) => {
            if (
              provider ===
              'apple'
            ) {
              return {
                provider:
                  'apple',

                provider_email:
                  null,

                connected:
                  true,
              };
            }

            return null;
          },
        );

        const utils =
          await renderSettings();

        await waitFor(() => {
          expect(
            mockGetAppleCalendarAccess,
          ).toHaveBeenCalled();
        });

        await openCalendarSettings(
          utils,
        );

        expect(
          utils.queryByText(
            'Apple Calendar connected',
          ),
        ).not.toBeOnTheScreen();

        appleAccess =
          'full';

        expect(
          mockAppStateChangeHandler,
        ).not.toBeNull();

        await act(
          async () => {
            mockAppStateChangeHandler?.(
              'active',
            );
          },
        );

        await waitFor(() => {
          expect(
            utils.getByText(
              'Apple Calendar connected',
            ),
          ).toBeOnTheScreen();
        });

        expect(
          mockStartAppleCalendarBackgroundSync,
        ).not.toHaveBeenCalled();

        expect(
          utils.queryByText(
            'Calendar connected!',
          ),
        ).not.toBeOnTheScreen();
      },
    );

    it(
      'records Apple Calendar as connected, starts the background sync, and shows the connection confirmation after the modal dismisses',
      async () => {
        mockGetAppleCalendarAccess
          .mockResolvedValueOnce(
            'denied',
          )
          .mockResolvedValueOnce(
            'full',
          );

        mockRequestAppleCalendarFullAccess.mockResolvedValue(
          {
            status:
              'granted',
          },
        );

        mockStartAppleCalendarBackgroundSync.mockResolvedValue(
          {
            imported:
              4,

            skipped:
              1,

            failed:
              0,

            total:
              5,
          },
        );

        const utils =
          await renderSettings();

        await openCalendarSettings(
          utils,
        );

        fireEvent.press(
          utils.getByRole(
            'button',
            {
              name:
                'Connect Apple Calendar',
            },
          ),
        );

        await waitFor(() => {
          expect(
            mockSaveCalendarConnection,
          ).toHaveBeenCalledWith(
            'apple',
            null,
          );
        });

        await waitFor(() => {
          expect(
            mockStartAppleCalendarBackgroundSync,
          ).toHaveBeenCalledTimes(
            1,
          );
        });

        await waitFor(() => {
          expect(
            utils.queryByText(
              'Calendar Connection Modal',
            ),
          ).not.toBeOnTheScreen();
        });

        await waitFor(() => {
          expect(
            utils.getByText(
              'Calendar connected!',
            ),
          ).toBeOnTheScreen();
        });

        expect(
          utils.getByText(
            'Apple Calendar is connected. Your events are syncing in the background.',
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'keeps Apple connected and shows the connection confirmation even if the background sync later fails',
      async () => {
        mockGetAppleCalendarAccess
          .mockResolvedValueOnce(
            'denied',
          )
          .mockResolvedValueOnce(
            'full',
          );

        mockStartAppleCalendarBackgroundSync.mockRejectedValueOnce(
          new Error(
            'Apple sync failed',
          ),
        );

        const utils =
          await renderSettings();

        await openCalendarSettings(
          utils,
        );

        fireEvent.press(
          utils.getByRole(
            'button',
            {
              name:
                'Connect Apple Calendar',
            },
          ),
        );

        await waitFor(() => {
          expect(
            mockSaveCalendarConnection,
          ).toHaveBeenCalledWith(
            'apple',
            null,
          );
        });

        await waitFor(() => {
          expect(
            mockStartAppleCalendarBackgroundSync,
          ).toHaveBeenCalledTimes(
            1,
          );
        });

        await waitFor(() => {
          expect(
            utils.getByText(
              'Calendar connected!',
            ),
          ).toBeOnTheScreen();
        });

        expect(
          Alert.alert,
        ).not.toHaveBeenCalledWith(
          'Calendar connected',
          expect.any(
            String,
          ),
        );

        expect(
          mockSaveCalendarConnection,
        ).toHaveBeenCalledWith(
          'apple',
          null,
        );
      },
    );

    it(
      'shows the connection confirmation even when the Apple background sync reports partial event failures',
      async () => {
        mockGetAppleCalendarAccess
          .mockResolvedValueOnce(
            'denied',
          )
          .mockResolvedValueOnce(
            'full',
          );

        mockStartAppleCalendarBackgroundSync.mockResolvedValue(
          {
            imported:
              3,

            skipped:
              1,

            failed:
              1,

            total:
              5,
          },
        );

        const utils =
          await renderSettings();

        await openCalendarSettings(
          utils,
        );

        fireEvent.press(
          utils.getByRole(
            'button',
            {
              name:
                'Connect Apple Calendar',
            },
          ),
        );

        await waitFor(() => {
          expect(
            mockSaveCalendarConnection,
          ).toHaveBeenCalledWith(
            'apple',
            null,
          );
        });

        await waitFor(() => {
          expect(
            mockStartAppleCalendarBackgroundSync,
          ).toHaveBeenCalledTimes(
            1,
          );
        });

        await waitFor(() => {
          expect(
            utils.getByText(
              'Calendar connected!',
            ),
          ).toBeOnTheScreen();
        });

        expect(
          Alert.alert,
        ).not.toHaveBeenCalledWith(
          'Calendar connected',
          expect.any(
            String,
          ),
        );
      },
    );

    it(
      'does not connect Apple Calendar when permission is denied',
      async () => {
        mockGetAppleCalendarAccess.mockResolvedValue(
          'denied',
        );

        mockRequestAppleCalendarFullAccess.mockResolvedValue(
          {
            status:
              'denied',
          },
        );

        const utils =
          await renderSettings();

        await openCalendarSettings(
          utils,
        );

        fireEvent.press(
          utils.getByRole(
            'button',
            {
              name:
                'Connect Apple Calendar',
            },
          ),
        );

        await waitFor(() => {
          expect(
            Alert.alert,
          ).toHaveBeenCalledWith(
            'Full Calendar Access needed',
            expect.any(
              String,
            ),
            expect.any(
              Array,
            ),
          );
        });

        expect(
          mockSaveCalendarConnection,
        ).not.toHaveBeenCalledWith(
          'apple',
          expect.anything(),
        );

        expect(
          mockStartAppleCalendarBackgroundSync,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'does not treat Add Events Only as a full Apple Calendar connection',
      async () => {
        mockGetAppleCalendarAccess.mockResolvedValue(
          'write-only',
        );

        mockRequestAppleCalendarFullAccess.mockResolvedValue(
          {
            status:
              'denied',
          },
        );

        const utils =
          await renderSettings();

        await openCalendarSettings(
          utils,
        );

        fireEvent.press(
          utils.getByRole(
            'button',
            {
              name:
                'Connect Apple Calendar',
            },
          ),
        );

        await waitFor(() => {
          expect(
            Alert.alert,
          ).toHaveBeenCalledWith(
            'Full Calendar Access needed',
            expect.stringContaining(
              'Add Events Only',
            ),
            expect.any(
              Array,
            ),
          );
        });

        expect(
          mockSaveCalendarConnection,
        ).not.toHaveBeenCalledWith(
          'apple',
          expect.anything(),
        );

        expect(
          mockStartAppleCalendarBackgroundSync,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'records Google Calendar as connected, starts the background sync, and shows the connection confirmation',
      async () => {
        mockHasGoogleCalendarAccess.mockResolvedValue(
          true,
        );

        mockGetGoogleUserInfo.mockResolvedValue(
          {
            email:
              'student@gmail.com',
          },
        );

        mockStartGoogleCalendarBackgroundSync.mockResolvedValue(
          {
            imported:
              4,

            skipped:
              1,

            failed:
              0,

            total:
              5,
          },
        );

        const utils =
          await renderSettings();

        await openCalendarSettings(
          utils,
        );

        mockGoogleResponse =
          {
            type:
              'success',

            authentication:
              {
                accessToken:
                  'google-access-token',
              },

            params:
              {},
          };

        await act(
          async () => {
            await utils.rerender(
              <SettingsScreen />,
            );
          },
        );

        await waitFor(() => {
          expect(
            mockHasGoogleCalendarAccess,
          ).toHaveBeenCalledWith(
            'google-access-token',
          );
        });

        await waitFor(() => {
          expect(
            mockSaveCalendarConnection,
          ).toHaveBeenCalledWith(
            'google',
            'student@gmail.com',
          );
        });

        await waitFor(() => {
          expect(
            mockStartGoogleCalendarBackgroundSync,
          ).toHaveBeenCalledTimes(
            1,
          );
        });

        await waitFor(() => {
          expect(
            utils.queryByText(
              'Calendar Connection Modal',
            ),
          ).not.toBeOnTheScreen();
        });

        await waitFor(() => {
          expect(
            utils.getByText(
              'Calendar connected!',
            ),
          ).toBeOnTheScreen();
        });

        expect(
          utils.getByText(
            'Google Calendar is connected. Your events are syncing in the background.',
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'keeps Google connected and shows the connection confirmation even if the background sync later fails',
      async () => {
        mockHasGoogleCalendarAccess.mockResolvedValue(
          true,
        );

        mockGetGoogleUserInfo.mockResolvedValue(
          {
            email:
              'student@gmail.com',
          },
        );

        mockStartGoogleCalendarBackgroundSync.mockRejectedValueOnce(
          new Error(
            'Google sync failed',
          ),
        );

        const utils =
          await renderSettings();

        await openCalendarSettings(
          utils,
        );

        mockGoogleResponse =
          {
            type:
              'success',

            authentication:
              {
                accessToken:
                  'google-access-token',
              },

            params:
              {},
          };

        await act(
          async () => {
            await utils.rerender(
              <SettingsScreen />,
            );
          },
        );

        await waitFor(() => {
          expect(
            mockSaveCalendarConnection,
          ).toHaveBeenCalledWith(
            'google',
            'student@gmail.com',
          );
        });

        await waitFor(() => {
          expect(
            mockStartGoogleCalendarBackgroundSync,
          ).toHaveBeenCalledTimes(
            1,
          );
        });

        await waitFor(() => {
          expect(
            utils.getByText(
              'Calendar connected!',
            ),
          ).toBeOnTheScreen();
        });

        expect(
          utils.getByText(
            'Google Calendar is connected. Your events are syncing in the background.',
          ),
        ).toBeOnTheScreen();

        expect(
          Alert.alert,
        ).not.toHaveBeenCalledWith(
          'Unable to connect calendar',
          expect.any(
            String,
          ),
        );

        expect(
          mockSaveCalendarConnection,
        ).toHaveBeenCalledWith(
          'google',
          'student@gmail.com',
        );
      },
    );

    it(
      'does not record Google Calendar when authorization is canceled',
      async () => {
        mockGoogleResponse =
          {
            type:
              'cancel',
          };

        const utils =
          await renderSettings();

        await waitFor(() => {
          expect(
            mockSaveCalendarConnection,
          ).not.toHaveBeenCalledWith(
            'google',
            expect.anything(),
          );
        });

        expect(
          mockStartGoogleCalendarBackgroundSync,
        ).not.toHaveBeenCalled();

        expect(
          utils.queryByText(
            'Calendar connected!',
          ),
        ).not.toBeOnTheScreen();
      },
    );

    it(
      'does not record Google Calendar when the Calendar scope was not granted',
      async () => {
        mockGoogleResponse =
          {
            type:
              'success',

            authentication:
              {
                accessToken:
                  'google-access-token',
              },

            params:
              {},
          };

        mockHasGoogleCalendarAccess.mockResolvedValue(
          false,
        );

        const utils =
          await renderSettings();

        await waitFor(() => {
          expect(
            mockHasGoogleCalendarAccess,
          ).toHaveBeenCalledWith(
            'google-access-token',
          );
        });

        await waitFor(() => {
          expect(
            Alert.alert,
          ).toHaveBeenCalledWith(
            'Google Calendar access needed',
            expect.stringContaining(
              'Google Calendar permission',
            ),
          );
        });

        expect(
          mockSaveCalendarConnection,
        ).not.toHaveBeenCalledWith(
          'google',
          expect.anything(),
        );

        expect(
          mockStartGoogleCalendarBackgroundSync,
        ).not.toHaveBeenCalled();

        expect(
          utils.queryByText(
            'Calendar connected!',
          ),
        ).not.toBeOnTheScreen();
      },
    );
    it(
      'keeps Google Calendar connected when disconnect is canceled',
      async () => {
        mockGetCalendarConnection.mockImplementation(
          async (
            provider: string,
          ) =>
            provider ===
            'google'
              ? {
                  provider:
                    'google',

                  provider_email:
                    'student@gmail.com',

                  connected:
                    true,
                }
              : null,
        );

        const utils =
          await renderSettings();

        await openCalendarSettings(
          utils,
        );

        await waitFor(() => {
          expect(
            utils.getByText(
              'Google Calendar connected',
            ),
          ).toBeOnTheScreen();
        });

        fireEvent.press(
          utils.getByRole(
            'button',
            {
              name:
                'Disconnect Google Calendar',
            },
          ),
        );

        await waitFor(() => {
          expect(
            utils.getByText(
              'Disconnect Google Calendar?',
            ),
          ).toBeOnTheScreen();
        });

        fireEvent.press(
          utils.getByRole(
            'button',
            {
              name:
                'Cancel Google Calendar disconnect',
            },
          ),
        );

        await waitFor(() => {
          expect(
            utils.getByText(
              'Google Calendar connected',
            ),
          ).toBeOnTheScreen();
        });

        expect(
          mockDisconnectGoogleCalendarWithCleanup,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'disconnects Google Calendar after confirmation and shows the connect option again',
      async () => {
        mockGetCalendarConnection.mockImplementation(
          async (
            provider: string,
          ) =>
            provider ===
            'google'
              ? {
                  provider:
                    'google',

                  provider_email:
                    'student@gmail.com',

                  connected:
                    true,
                }
              : null,
        );

        const utils =
          await renderSettings();

        await openCalendarSettings(
          utils,
        );

        fireEvent.press(
          utils.getByRole(
            'button',
            {
              name:
                'Disconnect Google Calendar',
            },
          ),
        );

        await waitFor(() => {
          expect(
            utils.getByText(
              'Disconnect Google Calendar?',
            ),
          ).toBeOnTheScreen();
        });

        fireEvent.press(
          utils.getByRole(
            'button',
            {
              name:
                'Confirm Google Calendar disconnect',
            },
          ),
        );

        await waitFor(() => {
          expect(
            mockDisconnectGoogleCalendarWithCleanup,
          ).toHaveBeenCalledTimes(
            1,
          );
        });

        await waitFor(() => {
          expect(
            utils.getByRole(
              'button',
              {
                name:
                  'Connect Google Calendar',
              },
            ),
          ).toBeOnTheScreen();
        });

        expect(
          utils.queryByText(
            'Disconnect Google Calendar?',
          ),
        ).not.toBeOnTheScreen();
      },
    );


  },
);
