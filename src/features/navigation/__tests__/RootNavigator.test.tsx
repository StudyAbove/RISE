import { NavigationContainer } from '@react-navigation/native';
import {
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { RootNavigator } from '../navigators/RootNavigator';

const mockGetSession = jest.fn();
const mockMaybeSingle = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),

      onAuthStateChange: (...args: unknown[]) =>
        mockOnAuthStateChange(...args),
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

async function renderNavigator() {
  await render(
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>,
  );
}

describe('RootNavigator', () => {
  let authStateCallback:
    | (() => void)
    | undefined;

  beforeEach(() => {
    jest.clearAllMocks();

    authStateCallback = undefined;

    mockOnAuthStateChange.mockImplementation(
      (callback: () => void) => {
        authStateCallback = callback;

        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        };
      },
    );
  });

  it('shows Welcome when there is no signed-in session', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: null,
      },
    });

    await renderNavigator();

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: 'Create Account',
        }),
      ).toBeOnTheScreen();

      expect(
        screen.getByRole('button', {
          name: 'Log In',
        }),
      ).toBeOnTheScreen();
    });
  });

  it('shows onboarding when signed in but onboarding is not complete', async () => {
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
        onboarding_completed: false,
      },
      error: null,
    });

    await renderNavigator();

    await waitFor(() => {
      expect(
        screen.getByText('Onboarding'),
      ).toBeOnTheScreen();
    });
  });

  it('restores an existing session and opens the main app without showing login', async () => {
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

    await renderNavigator();

    await waitFor(() => {
      expect(
        screen.getByText('RISE'),
      ).toBeOnTheScreen();

      expect(
        screen.queryByRole('button', {
          name: 'Log In',
        }),
      ).not.toBeOnTheScreen();
    });
  });

  it('opens the main tabs when signed in and onboarding is complete', async () => {
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

    await renderNavigator();

    await waitFor(() => {
      expect(
        screen.getAllByRole('tab'),
      ).toHaveLength(5);

      expect(
        screen.getByRole('tab', {
          name: 'Home',
        }),
      ).toBeSelected();

      expect(
        screen.getByText('RISE'),
      ).toBeOnTheScreen();
    });
  });

  it('reloads auth state when Supabase reports an auth state change', async () => {
    mockGetSession
      .mockResolvedValueOnce({
        data: {
          session: null,
        },
      })
      .mockResolvedValueOnce({
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

    await renderNavigator();

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: 'Log In',
        }),
      ).toBeOnTheScreen();
    });

    authStateCallback?.();

    await waitFor(() => {
      expect(
        screen.getByText('RISE'),
      ).toBeOnTheScreen();
    });

    expect(mockGetSession).toHaveBeenCalledTimes(2);
  });
});