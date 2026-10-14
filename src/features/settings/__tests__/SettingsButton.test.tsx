import { NavigationContainer } from '@react-navigation/native';

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { RootNavigator } from '../../navigation/navigators/RootNavigator';

const mockGetSession = jest.fn();
const mockMaybeSingle = jest.fn();
const mockOnAuthStateChange = jest.fn();

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

jest.mock('expo-calendar', () => ({
  getCalendarPermissions: jest
    .fn()
    .mockResolvedValue({
      status: 'denied',
    }),

  requestCalendarPermissions: jest
    .fn()
    .mockResolvedValue({
      status: 'denied',
    }),
}));

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),

      onAuthStateChange: (...args: unknown[]) =>
        mockOnAuthStateChange(...args),

      signOut: jest.fn().mockResolvedValue({
        error: null,
      }),

      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
          },
        },
        error: null,
      }),
    },

    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => mockMaybeSingle(),
        }),
      }),
    }),
  },
}));

async function renderApp() {
  mockGetSession.mockResolvedValue({
    data: {
      session: {
        user: {
          id: 'test-user-id',
        },
      },
    },
  });

  mockMaybeSingle.mockResolvedValue({
    data: {
      onboarding_completed: true,
    },
    error: null,
  });

  await render(
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>,
  );

  await waitFor(() => {
    expect(
      screen.getByRole('header', {
        name: 'Home',
      }),
    ).toBeOnTheScreen();
  });
}

describe('SettingsButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    });
  });

  it('opens the Settings page, and Back returns to the previous page', async () => {
    await renderApp();

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Settings',
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('header', {
          name: 'Settings',
        }),
      ).toBeOnTheScreen();
    });

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Back',
      }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole('header', {
          name: 'Settings',
        }),
      ).not.toBeOnTheScreen();

      expect(
        screen.getByRole('header', {
          name: 'Home',
        }),
      ).toBeOnTheScreen();
    });
  });

  it.each(['Study', 'List', 'Analytics'])(
    'is shown on the %s page',
    async (tab) => {
      await renderApp();

      fireEvent.press(
        screen.getByRole('tab', {
          name: tab,
        }),
      );

      await waitFor(() => {
        expect(
          screen.getByRole('header', {
            name: tab,
          }),
        ).toBeOnTheScreen();

        expect(
          screen.getByRole('button', {
            name: 'Settings',
          }),
        ).toBeOnTheScreen();
      });
    },
  );

  it('is not shown on the Calendar page', async () => {
    await renderApp();

    fireEvent.press(
      screen.getByRole('tab', {
        name: 'Calendar',
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('header', {
          name: 'Calendar',
        }),
      ).toBeOnTheScreen();

      expect(
        screen.queryByRole('button', {
          name: 'Settings',
        }),
      ).not.toBeOnTheScreen();
    });
  });
});