import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import {
  AppState,
} from 'react-native';

import {
  NotificationSettingsRow,
} from '../components/NotificationSettingsRow';

const mockLoadNotificationsEnabled =
  jest.fn();

const mockSaveNotificationsEnabled =
  jest.fn();

const mockCancelPendingNotifications =
  jest.fn();

const mockEnsureNotificationPermission =
  jest.fn();

const mockAreDeviceNotificationsAllowed =
  jest.fn();

jest.mock(
  '../../notifications/services/notificationPreferenceService',
  () => ({
    loadNotificationsEnabled:
      (...args: unknown[]) =>
        mockLoadNotificationsEnabled(
          ...args,
        ),

    saveNotificationsEnabled:
      (...args: unknown[]) =>
        mockSaveNotificationsEnabled(
          ...args,
        ),
  }),
);

jest.mock(
  '../../notifications/services/notificationService',
  () => ({
    areDeviceNotificationsAllowed:
      (...args: unknown[]) =>
        mockAreDeviceNotificationsAllowed(
          ...args,
        ),
    cancelPendingNotifications:
      (...args: unknown[]) =>
        mockCancelPendingNotifications(
          ...args,
        ),

    ensureNotificationPermission:
      (...args: unknown[]) =>
        mockEnsureNotificationPermission(
          ...args,
        ),
  }),
);

beforeEach(() => {
  jest.clearAllMocks();

  mockCancelPendingNotifications
    .mockResolvedValue(undefined);

  mockEnsureNotificationPermission
    .mockResolvedValue(true);

  mockAreDeviceNotificationsAllowed
    .mockResolvedValue(true);
});

describe(
  'NotificationSettingsRow (#84)',
  () => {
    it(
      'shows the saved enabled state',
      async () => {
        mockLoadNotificationsEnabled
          .mockReturnValue(true);

        await render(
          <NotificationSettingsRow />,
        );

        expect(
          screen.getByRole(
            'switch',
            {
              name:
                'Notifications',
              checked: true,
            },
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'shows the saved disabled state',
      async () => {
        mockLoadNotificationsEnabled
          .mockReturnValue(false);

        await render(
          <NotificationSettingsRow />,
        );

        expect(
          screen.getByRole(
            'switch',
            {
              name:
                'Notifications',
              checked: false,
            },
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'turns notifications off and cancels pending reminders',
      async () => {
        mockLoadNotificationsEnabled
          .mockReturnValue(true);

        await render(
          <NotificationSettingsRow />,
        );

        await act(async () => {
          fireEvent.press(
            screen.getByRole(
              'switch',
              {
                name:
                  'Notifications',
              },
            ),
          );
        });

        await waitFor(() => {
          expect(
            mockSaveNotificationsEnabled,
          ).toHaveBeenCalledWith(
            false,
          );

          expect(
            mockCancelPendingNotifications,
          ).toHaveBeenCalledTimes(
            1,
          );
        });

        expect(
          screen.getByRole(
            'switch',
            {
              name:
                'Notifications',
              checked: false,
            },
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'turns notifications on when device permission is granted',
      async () => {
        mockLoadNotificationsEnabled
          .mockReturnValue(false);

        mockEnsureNotificationPermission
          .mockResolvedValue(true);

        await render(
          <NotificationSettingsRow />,
        );

        await act(async () => {
          fireEvent.press(
            screen.getByRole(
              'switch',
              {
                name:
                  'Notifications',
              },
            ),
          );
        });

        await waitFor(() => {
          expect(
            mockEnsureNotificationPermission,
          ).toHaveBeenCalledTimes(
            1,
          );

          expect(
            mockSaveNotificationsEnabled,
          ).toHaveBeenCalledWith(
            true,
          );
        });

        expect(
          screen.getByRole(
            'switch',
            {
              name:
                'Notifications',
              checked: true,
            },
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'keeps notifications off when device permission is denied',
      async () => {
        mockLoadNotificationsEnabled
          .mockReturnValue(false);

        mockEnsureNotificationPermission
          .mockResolvedValue(false);

        await render(
          <NotificationSettingsRow />,
        );

        await act(async () => {
          fireEvent.press(
            screen.getByRole(
              'switch',
              {
                name:
                  'Notifications',
              },
            ),
          );
        });

        await waitFor(() => {
          expect(
            mockSaveNotificationsEnabled,
          ).toHaveBeenCalledWith(
            false,
          );
        });

        expect(
          screen.getByRole(
            'switch',
            {
              name:
                'Notifications',
              checked: false,
            },
          ),
        ).toBeOnTheScreen();
      },
    );

    it(
      'turns the RISE setting off when device permission is disabled',
      async () => {
        mockLoadNotificationsEnabled
          .mockReturnValue(true);

        mockAreDeviceNotificationsAllowed
          .mockResolvedValue(false);

        await render(
          <NotificationSettingsRow />,
        );

        await waitFor(() => {
          expect(
            screen.getByRole(
              'switch',
              {
                name:
                  'Notifications',
                checked: false,
              },
            ),
          ).toBeOnTheScreen();
        });

        expect(
          mockSaveNotificationsEnabled,
        ).toHaveBeenCalledWith(
          false,
        );
      },
    );

    it(
      'turns the RISE setting on after permission is enabled in system Settings',
      async () => {
        let appStateListener:
          | ((state: string) => void)
          | undefined;

        jest
          .spyOn(
            AppState,
            'addEventListener',
          )
          .mockImplementation(
            (_type, listener) => {
              appStateListener =
                listener as (
                  state: string,
                ) => void;

              return {
                remove: jest.fn(),
              };
            },
          );

        mockLoadNotificationsEnabled
          .mockReturnValue(false);

        mockAreDeviceNotificationsAllowed
          .mockResolvedValue(false);

        mockEnsureNotificationPermission
          .mockImplementation(
            async (
              onOpenSettings?:
                () => void,
            ) => {
              onOpenSettings?.();
              return false;
            },
          );

        await render(
          <NotificationSettingsRow />,
        );

        await act(async () => {
          fireEvent.press(
            screen.getByRole(
              'switch',
              {
                name:
                  'Notifications',
              },
            ),
          );
        });

        mockAreDeviceNotificationsAllowed
          .mockResolvedValue(true);

        await act(async () => {
          appStateListener?.(
            'active',
          );
        });

        await waitFor(() => {
          expect(
            screen.getByRole(
              'switch',
              {
                name:
                  'Notifications',
                checked: true,
              },
            ),
          ).toBeOnTheScreen();
        });

        expect(
          mockSaveNotificationsEnabled,
        ).toHaveBeenCalledWith(
          true,
        );
      },
    );

    it(
      'turns the RISE setting off after device permission is disabled externally',
      async () => {
        let appStateListener:
          | ((state: string) => void)
          | undefined;

        jest
          .spyOn(
            AppState,
            'addEventListener',
          )
          .mockImplementation(
            (_type, listener) => {
              appStateListener =
                listener as (
                  state: string,
                ) => void;

              return {
                remove: jest.fn(),
              };
            },
          );

        mockLoadNotificationsEnabled
          .mockReturnValue(true);

        mockAreDeviceNotificationsAllowed
          .mockResolvedValue(true);

        await render(
          <NotificationSettingsRow />,
        );

        mockAreDeviceNotificationsAllowed
          .mockResolvedValue(false);

        await act(async () => {
          appStateListener?.(
            'active',
          );
        });

        await waitFor(() => {
          expect(
            screen.getByRole(
              'switch',
              {
                name:
                  'Notifications',
                checked: false,
              },
            ),
          ).toBeOnTheScreen();
        });

        expect(
          mockSaveNotificationsEnabled,
        ).toHaveBeenCalledWith(
          false,
        );
      },
    );

    it(
      'keeps the RISE setting off when device permission remains enabled',
      async () => {
        mockLoadNotificationsEnabled
          .mockReturnValue(false);

        mockAreDeviceNotificationsAllowed
          .mockResolvedValue(true);

        await render(
          <NotificationSettingsRow />,
        );

        await waitFor(() => {
          expect(
            screen.getByRole(
              'switch',
              {
                name:
                  'Notifications',
                checked: false,
              },
            ),
          ).toBeOnTheScreen();
        });

        expect(
          mockSaveNotificationsEnabled,
        ).not.toHaveBeenCalledWith(
          true,
        );
      },
    );
  },
);
