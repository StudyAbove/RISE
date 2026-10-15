import {
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';

import { SettingsScreen } from '../screens/SettingsScreen';

const mockSignOut = jest.fn();

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => [
    {
      redirectUri: 'com.anonymous.rise:/oauthredirect',
    },
    null,
    jest.fn(),
  ],
}));

jest.mock(
  '../../calendar/services/calendarService',
  () => ({
    getAppleCalendarAccess: jest
      .fn()
      .mockResolvedValue('denied'),

    requestAppleCalendarFullAccess: jest
      .fn()
      .mockResolvedValue({
        status: 'denied',
      }),
  }),
);

jest.mock(
  '../../calendar/services/calendarConnectionService',
  () => ({
    getCalendarConnection: jest
      .fn()
      .mockResolvedValue(null),

    saveCalendarConnection: jest.fn(),
  }),
);

jest.mock(
  '../../calendar/services/googleCalendarService',
  () => ({
    getGoogleUserInfo: jest.fn(),

    hasGoogleCalendarAccess: jest.fn(),
  }),
);

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: () => mockSignOut(),
    },
  },
}));

jest.mock('../../../components/BackButton', () => ({
  BackButton: () => null,
}));

describe('Logout', () => {
  it('requires confirmation before signing the user out', async () => {
    jest.clearAllMocks();

    mockSignOut.mockResolvedValue({
      error: null,
    });

    const {
      getByRole,
      getByText,
      queryByText,
    } = await render(
      <SettingsScreen />,
    );

    // Open logout confirmation
    fireEvent.press(
      getByRole('button', {
        name: 'Logout',
      }),
    );

    await waitFor(() => {
      expect(
        getByText(
          'Are you sure you want to logout?',
        ),
      ).toBeOnTheScreen();
    });

    expect(
      mockSignOut,
    ).not.toHaveBeenCalled();

    // Cancel should close the popup
    fireEvent.press(
      getByRole('button', {
        name: 'Cancel logout',
      }),
    );

    await waitFor(() => {
      expect(
        queryByText(
          'Are you sure you want to logout?',
        ),
      ).not.toBeOnTheScreen();
    });

    expect(
      mockSignOut,
    ).not.toHaveBeenCalled();

    // Open it again
    fireEvent.press(
      getByRole('button', {
        name: 'Logout',
      }),
    );

    await waitFor(() => {
      expect(
        getByText(
          'Are you sure you want to logout?',
        ),
      ).toBeOnTheScreen();
    });

    // Confirm logout
    fireEvent.press(
      getByRole('button', {
        name: 'Confirm logout',
      }),
    );

    await waitFor(() => {
      expect(
        mockSignOut,
      ).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(
        queryByText(
          'Are you sure you want to logout?',
        ),
      ).not.toBeOnTheScreen();
    });
  });
});