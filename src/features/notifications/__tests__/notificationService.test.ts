import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

import {
  areDeviceNotificationsAllowed,
  cancelPendingNotifications,
  ensureNotificationPermission,
} from '../services/notificationService';

jest.mock(
  'expo-notifications',
  () => ({
    getPermissionsAsync:
      jest.fn(),
    requestPermissionsAsync:
      jest.fn(),
    cancelAllScheduledNotificationsAsync:
      jest.fn(),
    IosAuthorizationStatus: {
      NOT_DETERMINED: 0,
      DENIED: 1,
      AUTHORIZED: 2,
      PROVISIONAL: 3,
      EPHEMERAL: 4,
    },
  }),
);

const mockGetPermissionsAsync =
  jest.mocked(
    Notifications.getPermissionsAsync,
  );

const mockRequestPermissionsAsync =
  jest.mocked(
    Notifications.requestPermissionsAsync,
  );

const mockCancelAll =
  jest.mocked(
    Notifications
      .cancelAllScheduledNotificationsAsync,
  );

const mockOpenSettings =
  jest.spyOn(
    Linking,
    'openSettings',
  );

beforeEach(() => {
  jest.clearAllMocks();

  mockOpenSettings
    .mockResolvedValue(undefined);
});

describe(
  'notification service (#84)',
  () => {
    it(
      'recognizes granted device permission',
      async () => {
        mockGetPermissionsAsync
          .mockResolvedValue({
            granted: true,
          } as Notifications.NotificationPermissionsStatus);

        await expect(
          areDeviceNotificationsAllowed(),
        ).resolves.toBe(true);
      },
    );

    it(
      'recognizes iOS provisional permission',
      async () => {
        mockGetPermissionsAsync
          .mockResolvedValue({
            granted: false,
            ios: {
              status:
                Notifications
                  .IosAuthorizationStatus
                  .PROVISIONAL,
            },
          } as Notifications.NotificationPermissionsStatus);

        await expect(
          areDeviceNotificationsAllowed(),
        ).resolves.toBe(true);
      },
    );

    it(
      'returns false when device permission is denied',
      async () => {
        mockGetPermissionsAsync
          .mockResolvedValue({
            granted: false,
            ios: {
              status:
                Notifications
                  .IosAuthorizationStatus
                  .DENIED,
            },
          } as Notifications.NotificationPermissionsStatus);

        await expect(
          areDeviceNotificationsAllowed(),
        ).resolves.toBe(false);
      },
    );

    it(
      'does not request permission when it is already allowed',
      async () => {
        mockGetPermissionsAsync
          .mockResolvedValue({
            granted: true,
          } as Notifications.NotificationPermissionsStatus);

        await expect(
          ensureNotificationPermission(),
        ).resolves.toBe(true);

        expect(
          mockRequestPermissionsAsync,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'requests permission when it is not already allowed',
      async () => {
        mockGetPermissionsAsync
          .mockResolvedValue({
            granted: false,
            ios: {
              status:
                Notifications
                  .IosAuthorizationStatus
                  .NOT_DETERMINED,
            },
          } as Notifications.NotificationPermissionsStatus);

        mockRequestPermissionsAsync
          .mockResolvedValue({
            granted: true,
          } as Notifications.NotificationPermissionsStatus);

        await expect(
          ensureNotificationPermission(),
        ).resolves.toBe(true);

        expect(
          mockRequestPermissionsAsync,
        ).toHaveBeenCalledTimes(1);
      },
    );

    it(
      'opens Settings when permission was already denied and cannot be asked again',
      async () => {
        mockGetPermissionsAsync
          .mockResolvedValue({
            granted: false,
            canAskAgain: false,
            ios: {
              status:
                Notifications
                  .IosAuthorizationStatus
                  .DENIED,
            },
          } as Notifications.NotificationPermissionsStatus);

        await expect(
          ensureNotificationPermission(),
        ).resolves.toBe(false);

        expect(
          mockRequestPermissionsAsync,
        ).not.toHaveBeenCalled();

        expect(
          mockOpenSettings,
        ).toHaveBeenCalledTimes(1);
      },
    );

    it(
      'opens Settings when a newly denied permission cannot be asked again',
      async () => {
        mockGetPermissionsAsync
          .mockResolvedValue({
            granted: false,
            canAskAgain: true,
            ios: {
              status:
                Notifications
                  .IosAuthorizationStatus
                  .NOT_DETERMINED,
            },
          } as Notifications.NotificationPermissionsStatus);

        mockRequestPermissionsAsync
          .mockResolvedValue({
            granted: false,
            canAskAgain: false,
            ios: {
              status:
                Notifications
                  .IosAuthorizationStatus
                  .DENIED,
            },
          } as Notifications.NotificationPermissionsStatus);

        await expect(
          ensureNotificationPermission(),
        ).resolves.toBe(false);

        expect(
          mockRequestPermissionsAsync,
        ).toHaveBeenCalledTimes(1);

        expect(
          mockOpenSettings,
        ).toHaveBeenCalledTimes(1);
      },
    );

    it(
      'cancels pending scheduled notifications',
      async () => {
        mockCancelAll
          .mockResolvedValue(undefined);

        await cancelPendingNotifications();

        expect(
          mockCancelAll,
        ).toHaveBeenCalledTimes(1);
      },
    );
  },
);
