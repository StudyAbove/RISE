import { NavigationContainer } from '@react-navigation/native';

import {
  AppState,
} from 'react-native';

import {
  act,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import {
  RootNavigator,
} from '../navigators/RootNavigator';

const mockGetSession =
  jest.fn();

const mockMaybeSingle =
  jest.fn();

const mockOnAuthStateChange =
  jest.fn();

const mockGetAppleCalendarAccess =
  jest.fn();

const mockGetLastAppleCalendarAccess =
  jest.fn();

const mockSaveLastAppleCalendarAccess =
  jest.fn();

const mockIsAppleCalendarConnectionPending =
  jest.fn();

const mockClearAppleCalendarConnectionPending =
  jest.fn();

const mockGetCalendarConnection =
  jest.fn();

const mockSaveCalendarConnection =
  jest.fn();

const mockStartAppleCalendarBackgroundSync =
  jest.fn();

let mockAppStateChangeHandler:
  | ((
      state: string,
    ) => void)
  | null =
  null;

jest.mock(
  '../../../lib/supabase',
  () => ({
    supabase: {
      auth: {
        getSession:
          () =>
            mockGetSession(),

        onAuthStateChange:
          (...args: unknown[]) =>
            mockOnAuthStateChange(
              ...args,
            ),
      },

      from:
        () => ({
          select:
            () => ({
              eq:
                () => ({
                  maybeSingle:
                    () =>
                      mockMaybeSingle(),
                }),
            }),
        }),
    },
  }),
);

jest.mock(
  '../../../repositories/profileRepository',
  () => ({
    fetchCurrentDisplayName:
      async () =>
        null,
  }),
);

jest.mock(
  '../../calendar/services/calendarService',
  () => ({
    getAppleCalendarAccess:
      (...args: unknown[]) =>
        mockGetAppleCalendarAccess(
          ...args,
        ),
  }),
);

jest.mock(
  '../../calendar/services/appleCalendarConnectionStateService',
  () => ({
    getLastAppleCalendarAccess:
      (...args: unknown[]) =>
        mockGetLastAppleCalendarAccess(
          ...args,
        ),

    saveLastAppleCalendarAccess:
      (...args: unknown[]) =>
        mockSaveLastAppleCalendarAccess(
          ...args,
        ),

    isAppleCalendarConnectionPending:
      (...args: unknown[]) =>
        mockIsAppleCalendarConnectionPending(
          ...args,
        ),

    clearAppleCalendarConnectionPending:
      (...args: unknown[]) =>
        mockClearAppleCalendarConnectionPending(
          ...args,
        ),
  }),
);

jest.mock(
  '../../calendar/services/calendarConnectionService',
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
  }),
);

jest.mock(
  '../../calendar/services/calendarBackgroundSyncService',
  () => ({
    startAppleCalendarBackgroundSync:
      (...args: unknown[]) =>
        mockStartAppleCalendarBackgroundSync(
          ...args,
        ),
  }),
);

jest.mock(
  '../../calendar/components/CalendarSyncSuccessModal',
  () => {
    const {
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
      }: {
        visible: boolean;
        provider:
          | 'Apple'
          | 'Google'
          | null;
      }) => {
        if (!visible) {
          return null;
        }

        return (
          <View>
            <Text>
              Calendar connected!
            </Text>

            <Text>
              {provider}
            </Text>
          </View>
        );
      },
    };
  },
);

async function renderNavigator() {
  await render(
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>,
  );
}

function setSignedInMocks() {
  mockGetSession.mockResolvedValue({
    data: {
      session: {
        user: {
          id:
            'test-user-id',
        },
      },
    },
  });

  mockMaybeSingle.mockResolvedValue({
    data: {
      onboarding_completed:
        true,
    },

    error:
      null,
  });
}

function setDefaultAppleMocks() {
  mockGetAppleCalendarAccess.mockResolvedValue(
    'denied',
  );

  mockGetLastAppleCalendarAccess.mockResolvedValue(
    'denied',
  );

  mockSaveLastAppleCalendarAccess.mockResolvedValue(
    undefined,
  );

  mockIsAppleCalendarConnectionPending.mockResolvedValue(
    false,
  );

  mockClearAppleCalendarConnectionPending.mockResolvedValue(
    undefined,
  );

  mockGetCalendarConnection.mockResolvedValue(
    null,
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
}

describe(
  'RootNavigator',
  () => {
    let authStateCallback:
      | (() => void)
      | undefined;

    beforeEach(() => {
      jest.clearAllMocks();

      authStateCallback =
        undefined;

      mockAppStateChangeHandler =
        null;

      setDefaultAppleMocks();

      mockOnAuthStateChange.mockImplementation(
        (
          callback: () => void,
        ) => {
          authStateCallback =
            callback;

          return {
            data: {
              subscription: {
                unsubscribe:
                  jest.fn(),
              },
            },
          };
        },
      );

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
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it(
      'shows Welcome when there is no signed-in session',
      async () => {
        mockGetSession.mockResolvedValue({
          data: {
            session:
              null,
          },
        });

        await renderNavigator();

        await waitFor(() => {
          expect(
            screen.getByRole(
              'button',
              {
                name:
                  'Create Account',
              },
            ),
          ).toBeOnTheScreen();

          expect(
            screen.getByRole(
              'button',
              {
                name:
                  'Log In',
              },
            ),
          ).toBeOnTheScreen();
        });
      },
    );

    it(
      'shows onboarding when signed in but onboarding is not complete',
      async () => {
        mockGetSession.mockResolvedValue({
          data: {
            session: {
              user: {
                id:
                  'test-user-id',
              },
            },
          },
        });

        mockMaybeSingle.mockResolvedValue({
          data: {
            onboarding_completed:
              false,
          },

          error:
            null,
        });

        await renderNavigator();

        await waitFor(() => {
          expect(
            screen.getByText(
              'Connect your classes',
            ),
          ).toBeOnTheScreen();
        });
      },
    );

    it(
      'restores an existing session and opens the main app without showing login',
      async () => {
        setSignedInMocks();

        await renderNavigator();

        await waitFor(() => {
          expect(
            screen.getByText(
              'RISE',
            ),
          ).toBeOnTheScreen();

          expect(
            screen.queryByRole(
              'button',
              {
                name:
                  'Log In',
              },
            ),
          ).not.toBeOnTheScreen();
        });
      },
    );

    it(
      'opens the main tabs when signed in and onboarding is complete',
      async () => {
        setSignedInMocks();

        await renderNavigator();

        await waitFor(() => {
          expect(
            screen.getAllByRole(
              'tab',
            ),
          ).toHaveLength(
            5,
          );

          expect(
            screen.getByRole(
              'tab',
              {
                name:
                  'Home',
              },
            ),
          ).toBeSelected();

          expect(
            screen.getByText(
              'RISE',
            ),
          ).toBeOnTheScreen();
        });
      },
    );

    it(
      'reloads auth state when Supabase reports an auth state change',
      async () => {
        mockGetSession
          .mockResolvedValueOnce({
            data: {
              session:
                null,
            },
          })
          .mockResolvedValueOnce({
            data: {
              session: {
                user: {
                  id:
                    'test-user-id',
                },
              },
            },
          });

        mockMaybeSingle.mockResolvedValue({
          data: {
            onboarding_completed:
              true,
          },

          error:
            null,
        });

        await renderNavigator();

        await waitFor(() => {
          expect(
            screen.getByRole(
              'button',
              {
                name:
                  'Log In',
              },
            ),
          ).toBeOnTheScreen();
        });

        await act(
          async () => {
            authStateCallback?.();
          },
        );

        await waitFor(() => {
          expect(
            screen.getByText(
              'RISE',
            ),
          ).toBeOnTheScreen();
        });

        expect(
          mockGetSession,
        ).toHaveBeenCalledTimes(
          2,
        );
      },
    );

    it(
      'starts Apple background sync when an existing connection regains Full Access',
      async () => {
        setSignedInMocks();

        let appleAccess:
          'denied' | 'full' =
          'denied';

        let lastAppleAccess:
          'denied' | 'full' =
          'denied';

        mockGetAppleCalendarAccess.mockImplementation(
          async () =>
            appleAccess,
        );

        mockGetLastAppleCalendarAccess.mockImplementation(
          async () =>
            lastAppleAccess,
        );

        mockSaveLastAppleCalendarAccess.mockImplementation(
          async (
            access:
              'denied' | 'full',
          ) => {
            lastAppleAccess =
              access;
          },
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

        await renderNavigator();

        await waitFor(() => {
          expect(
            screen.getByText(
              'RISE',
            ),
          ).toBeOnTheScreen();
        });

        await waitFor(() => {
          expect(
            mockSaveLastAppleCalendarAccess,
          ).toHaveBeenCalledWith(
            'denied',
          );
        });

        expect(
          mockStartAppleCalendarBackgroundSync,
        ).not.toHaveBeenCalled();

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
            mockStartAppleCalendarBackgroundSync,
          ).toHaveBeenCalledTimes(
            1,
          );
        });

        expect(
          screen.queryByText(
            'Calendar connected!',
          ),
        ).not.toBeOnTheScreen();
      },
    );

    it(
      'does not start Apple reconnect sync when Full Access was already available',
      async () => {
        setSignedInMocks();

        mockGetAppleCalendarAccess.mockResolvedValue(
          'full',
        );

        mockGetLastAppleCalendarAccess.mockResolvedValue(
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

            return null;
          },
        );

        await renderNavigator();

        await waitFor(() => {
          expect(
            screen.getByText(
              'RISE',
            ),
          ).toBeOnTheScreen();
        });

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
            mockGetAppleCalendarAccess,
          ).toHaveBeenCalled();
        });

        expect(
          mockStartAppleCalendarBackgroundSync,
        ).not.toHaveBeenCalled();

        expect(
          screen.queryByText(
            'Calendar connected!',
          ),
        ).not.toBeOnTheScreen();
      },
    );

    it(
      'does not silently create an Apple connection when Full Access is restored but Apple was never connected in RISE',
      async () => {
        setSignedInMocks();

        let appleAccess:
          'denied' | 'full' =
          'denied';

        let lastAppleAccess:
          'denied' | 'full' =
          'denied';

        mockGetAppleCalendarAccess.mockImplementation(
          async () =>
            appleAccess,
        );

        mockGetLastAppleCalendarAccess.mockImplementation(
          async () =>
            lastAppleAccess,
        );

        mockSaveLastAppleCalendarAccess.mockImplementation(
          async (
            access:
              'denied' | 'full',
          ) => {
            lastAppleAccess =
              access;
          },
        );

        mockGetCalendarConnection.mockResolvedValue(
          null,
        );

        await renderNavigator();

        await waitFor(() => {
          expect(
            screen.getByText(
              'RISE',
            ),
          ).toBeOnTheScreen();
        });

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
            mockSaveLastAppleCalendarAccess,
          ).toHaveBeenCalledWith(
            'full',
          );
        });

        expect(
          mockSaveCalendarConnection,
        ).not.toHaveBeenCalled();

        expect(
          mockStartAppleCalendarBackgroundSync,
        ).not.toHaveBeenCalled();

        expect(
          screen.queryByText(
            'Calendar connected!',
          ),
        ).not.toBeOnTheScreen();
      },
    );

    it(
      'recovers a pending first Apple connection after returning with Full Access',
      async () => {
        setSignedInMocks();

        let appleAccess:
          'denied' | 'full' =
          'denied';

        mockGetAppleCalendarAccess.mockImplementation(
          async () =>
            appleAccess,
        );

        mockGetLastAppleCalendarAccess.mockResolvedValue(
          'denied',
        );

        mockIsAppleCalendarConnectionPending.mockResolvedValue(
          true,
        );

        mockGetCalendarConnection.mockResolvedValue(
          null,
        );

        await renderNavigator();

        await waitFor(() => {
          expect(
            screen.getByText(
              'RISE',
            ),
          ).toBeOnTheScreen();
        });

        /*
         * The pending connection should not complete while
         * Full Access is still unavailable.
         */
        expect(
          mockSaveCalendarConnection,
        ).not.toHaveBeenCalled();

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
            mockSaveCalendarConnection,
          ).toHaveBeenCalledWith(
            'apple',
            null,
          );
        });

        await waitFor(() => {
          expect(
            mockClearAppleCalendarConnectionPending,
          ).toHaveBeenCalledTimes(
            1,
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
            screen.getByText(
              'Calendar connected!',
            ),
          ).toBeOnTheScreen();

          expect(
            screen.getByText(
              'Apple',
            ),
          ).toBeOnTheScreen();
        });
      },
    );
  },
);