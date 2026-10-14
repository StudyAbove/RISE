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

import { SettingsScreen } from '../../settings/screens/SettingsScreen';

const mockGetAppleCalendarAccess = jest.fn();
const mockRequestAppleCalendarFullAccess = jest.fn();

const mockGetCalendarConnection = jest.fn();
const mockSaveCalendarConnection = jest.fn();

const mockGetGoogleUserInfo = jest.fn();
const mockHasGoogleCalendarAccess = jest.fn();

const mockPromptGoogleAsync = jest.fn();

let mockGoogleResponse: any = null;

jest.mock('expo-calendar', () => ({}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => [
    {
      redirectUri: 'com.anonymous.rise:/oauthredirect',
    },
    mockGoogleResponse,
    mockPromptGoogleAsync,
  ],
}));

jest.mock(
  '../services/calendarService',
  () => ({
    getAppleCalendarAccess: (...args: unknown[]) =>
      mockGetAppleCalendarAccess(...args),

    requestAppleCalendarFullAccess: (...args: unknown[]) =>
      mockRequestAppleCalendarFullAccess(...args),
  }),
);

jest.mock(
  '../services/calendarConnectionService',
  () => ({
    getCalendarConnection: (...args: unknown[]) =>
      mockGetCalendarConnection(...args),

    saveCalendarConnection: (...args: unknown[]) =>
      mockSaveCalendarConnection(...args),
  }),
);

jest.mock(
  '../services/googleCalendarService',
  () => ({
    getGoogleUserInfo: (...args: unknown[]) =>
      mockGetGoogleUserInfo(...args),

    hasGoogleCalendarAccess: (...args: unknown[]) =>
      mockHasGoogleCalendarAccess(...args),
  }),
);

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: jest.fn().mockResolvedValue({
        error: null,
      }),
    },
  },
}));

jest.mock(
  '../../../components/BackButton',
  () => {
    const { View } = require('react-native');

    return {
      BackButton: () => <View />,
    };
  },
);

jest.mock(
  'react-native-safe-area-context',
  () => ({
    useSafeAreaInsets: () => ({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    }),
  }),
);

jest.mock(
  '../components/CalendarConnectionModal',
  () => {
    const {
      Pressable,
      Text,
      View,
    } = require('react-native');

    return {
      CalendarConnectionModal: ({
        visible,
        appleConnected,
        googleConnected,
        googleEmail,
        onConnectApple,
        onConnectGoogle,
      }: any) => {
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
                onPress={onConnectApple}
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
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Connect Google Calendar"
                onPress={onConnectGoogle}
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
    } = require('react-native');

    return {
      CalendarSyncSuccessModal: ({
        visible,
        provider,
        onDone,
      }: any) => {
        if (!visible) {
          return null;
        }

        return (
          <View>
            <Text>
              Calendar synced!
            </Text>

            <Text>
              {provider} Calendar connected successfully
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done"
              onPress={onDone}
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
  mockGetAppleCalendarAccess.mockResolvedValue(
    'denied',
  );

  mockGetCalendarConnection.mockImplementation(
    async () => null,
  );

  mockRequestAppleCalendarFullAccess.mockResolvedValue({
    status: 'granted',
  });

  mockSaveCalendarConnection.mockResolvedValue(
    undefined,
  );

  mockHasGoogleCalendarAccess.mockResolvedValue(
    true,
  );

  mockGetGoogleUserInfo.mockResolvedValue({
    email: 'student@gmail.com',
  });

  mockPromptGoogleAsync.mockResolvedValue({
    type: 'success',
  });
}

async function renderSettings() {
  const utils = await render(
    <SettingsScreen />,
  );

  await waitFor(() => {
    expect(
      utils.getByRole('header', {
        name: 'Settings',
      }),
    ).toBeOnTheScreen();
  });

  return utils;
}

async function openCalendarSettings(
  utils: Awaited<ReturnType<typeof render>>,
) {
  fireEvent.press(
    utils.getByRole('button', {
      name: 'Open calendar settings',
    }),
  );

  await waitFor(() => {
    expect(
      utils.getByText(
        'Calendar Connection Modal',
      ),
    ).toBeOnTheScreen();
  });
}

describe('Calendar connection', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGoogleResponse = null;

    setDefaultConnectionMocks();

    jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({
        remove: jest.fn(),
      } as any);

    jest
      .spyOn(Alert, 'alert')
      .mockImplementation(() => {});

    jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows Apple and Google connection options when Calendar settings opens', async () => {
    const utils = await renderSettings();

    await openCalendarSettings(utils);

    expect(
      utils.getByRole('button', {
        name: 'Connect Apple Calendar',
      }),
    ).toBeOnTheScreen();

    expect(
      utils.getByRole('button', {
        name: 'Connect Google Calendar',
      }),
    ).toBeOnTheScreen();
  });

  it('recognizes previously connected Apple and Google calendars', async () => {
    mockGetAppleCalendarAccess.mockResolvedValue(
      'full',
    );

    mockGetCalendarConnection.mockImplementation(
      async (provider: string) => {
        if (provider === 'apple') {
          return {
            provider: 'apple',
            provider_email: null,
            connected: true,
          };
        }

        if (provider === 'google') {
          return {
            provider: 'google',
            provider_email:
              'student@gmail.com',
            connected: true,
          };
        }

        return null;
      },
    );

    const utils = await renderSettings();

    await waitFor(() => {
      expect(
        mockGetCalendarConnection,
      ).toHaveBeenCalledWith('apple');

      expect(
        mockGetCalendarConnection,
      ).toHaveBeenCalledWith('google');
    });

    await openCalendarSettings(utils);

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
  });

  it('records Apple Calendar as connected after Full Access is granted', async () => {
    mockGetAppleCalendarAccess
      .mockResolvedValueOnce('denied')
      .mockResolvedValueOnce('full');

    mockRequestAppleCalendarFullAccess.mockResolvedValue({
      status: 'granted',
    });

    const utils = await renderSettings();

    await openCalendarSettings(utils);

    fireEvent.press(
      utils.getByRole('button', {
        name: 'Connect Apple Calendar',
      }),
    );

    await waitFor(() => {
      expect(
        mockSaveCalendarConnection,
      ).toHaveBeenCalledWith(
        'apple',
        null,
      );
    });

    expect(
      utils.getByText(
        'Calendar synced!',
      ),
    ).toBeOnTheScreen();

    expect(
      utils.getByText(
        'Apple Calendar connected successfully',
      ),
    ).toBeOnTheScreen();
  });

  it('does not connect Apple Calendar when permission is denied', async () => {
    mockGetAppleCalendarAccess.mockResolvedValue(
      'denied',
    );

    mockRequestAppleCalendarFullAccess.mockResolvedValue({
      status: 'denied',
    });

    const utils = await renderSettings();

    await openCalendarSettings(utils);

    fireEvent.press(
      utils.getByRole('button', {
        name: 'Connect Apple Calendar',
      }),
    );

    await waitFor(() => {
      expect(
        Alert.alert,
      ).toHaveBeenCalledWith(
        'Full Calendar Access needed',
        expect.any(String),
        expect.any(Array),
      );
    });

    expect(
      mockSaveCalendarConnection,
    ).not.toHaveBeenCalledWith(
      'apple',
      expect.anything(),
    );
  });

  it('does not treat Add Events Only as a full Apple Calendar connection', async () => {
    mockGetAppleCalendarAccess.mockResolvedValue(
      'write-only',
    );

    mockRequestAppleCalendarFullAccess.mockResolvedValue({
      status: 'denied',
    });

    const utils = await renderSettings();

    await openCalendarSettings(utils);

    fireEvent.press(
      utils.getByRole('button', {
        name: 'Connect Apple Calendar',
      }),
    );

    await waitFor(() => {
      expect(
        Alert.alert,
      ).toHaveBeenCalledWith(
        'Full Calendar Access needed',
        expect.stringContaining(
          'Add Events Only',
        ),
        expect.any(Array),
      );
    });

    expect(
      mockSaveCalendarConnection,
    ).not.toHaveBeenCalledWith(
      'apple',
      expect.anything(),
    );
  });

  it('records Google Calendar as connected when Calendar permission is granted', async () => {
    mockGoogleResponse = {
      type: 'success',
      authentication: {
        accessToken:
          'google-access-token',
      },
      params: {},
    };

    mockHasGoogleCalendarAccess.mockResolvedValue(
      true,
    );

    mockGetGoogleUserInfo.mockResolvedValue({
      email: 'student@gmail.com',
    });

    const utils = await renderSettings();

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

    expect(
      utils.getByText(
        'Calendar synced!',
      ),
    ).toBeOnTheScreen();

    expect(
      utils.getByText(
        'Google Calendar connected successfully',
      ),
    ).toBeOnTheScreen();
  });

  it('does not record Google Calendar when authorization is canceled', async () => {
    mockGoogleResponse = {
      type: 'cancel',
    };

    const utils = await renderSettings();

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      mockSaveCalendarConnection,
    ).not.toHaveBeenCalledWith(
      'google',
      expect.anything(),
    );

    expect(
      utils.queryByText(
        'Calendar synced!',
      ),
    ).not.toBeOnTheScreen();
  });

  it('does not record Google Calendar when the Calendar scope was not granted', async () => {
    mockGoogleResponse = {
      type: 'success',
      authentication: {
        accessToken:
          'google-access-token',
      },
      params: {},
    };

    mockHasGoogleCalendarAccess.mockResolvedValue(
      false,
    );

    const utils = await renderSettings();

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
      utils.queryByText(
        'Calendar synced!',
      ),
    ).not.toBeOnTheScreen();
  });
});