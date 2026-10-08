import { NavigationContainer } from '@react-navigation/native';
import { render, screen, waitFor } from '@testing-library/react-native';

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

describe('RootNavigator', () => {
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

  it('shows Create Account when there is no signed-in session', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: null,
      },
    });

    render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Welcome!'),
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

    render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Onboarding'),
      ).toBeOnTheScreen();
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

    render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>,
    );

    await waitFor(() => {
      expect(screen.getAllByRole('tab')).toHaveLength(5);

      expect(
        screen.getByRole('tab', { name: 'Home' }),
      ).toBeSelected();

      expect(
        screen.getByRole('header', { name: 'Home' }),
      ).toBeOnTheScreen();
    });
  });
});