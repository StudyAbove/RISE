import Storage from 'expo-sqlite/kv-store';

import {
  loadNotificationsEnabled,
  saveNotificationsEnabled,
} from '../services/notificationPreferenceService';

const mockStore =
  new Map<string, string>();

jest.mock(
  'expo-sqlite/kv-store',
  () => ({
    __esModule: true,
    default: {
      getItemSync: jest.fn(
        (key: string) =>
          mockStore.get(key) ?? null,
      ),
      setItemSync: jest.fn(
        (
          key: string,
          value: string,
        ) => {
          mockStore.set(
            key,
            value,
          );
        },
      ),
    },
  }),
);

const mockStorage =
  jest.mocked(Storage);

beforeEach(() => {
  mockStore.clear();

  jest
    .spyOn(
      console,
      'log',
    )
    .mockImplementation(
      () => {},
    );
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe(
  'notification preference (#84)',
  () => {
    it(
      'defaults notifications to enabled when nothing has been saved',
      () => {
        expect(
          loadNotificationsEnabled(),
        ).toBe(true);
      },
    );

    it(
      'saves and restores the disabled preference',
      () => {
        saveNotificationsEnabled(
          false,
        );

        expect(
          loadNotificationsEnabled(),
        ).toBe(false);
      },
    );

    it(
      'saves and restores the enabled preference',
      () => {
        saveNotificationsEnabled(
          true,
        );

        expect(
          loadNotificationsEnabled(),
        ).toBe(true);
      },
    );

    it(
      'defaults to enabled when the saved value is invalid',
      () => {
        mockStore.set(
          'rise.notificationsEnabled',
          'maybe',
        );

        expect(
          loadNotificationsEnabled(),
        ).toBe(true);
      },
    );

    it(
      'defaults to enabled when the store cannot be read',
      () => {
        mockStorage.getItemSync
          .mockImplementationOnce(
            () => {
              throw new Error(
                'database is locked',
              );
            },
          );

        expect(
          loadNotificationsEnabled(),
        ).toBe(true);
      },
    );

    it(
      'does not crash when the preference cannot be saved',
      () => {
        mockStorage.setItemSync
          .mockImplementationOnce(
            () => {
              throw new Error(
                'disk full',
              );
            },
          );

        expect(
          () =>
            saveNotificationsEnabled(
              false,
            ),
        ).not.toThrow();
      },
    );
  },
);
