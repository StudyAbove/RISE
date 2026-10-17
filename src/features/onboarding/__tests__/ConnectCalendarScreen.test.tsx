import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';

import type { CalendarProviderName } from '../../calendar/hooks/useCalendarConnection';
import { ConnectCalendarScreen } from '../screens/ConnectCalendarScreen';

const mockNavigate = jest.fn();
const mockConnectApple = jest.fn();
const mockConnectGoogle = jest.fn();

let mockConnectionState = {
  appleConnected: false,
  googleConnected: false,
  isConnectingApple: false,
  isConnectingGoogle: false,
};

let mockOnConnected: ((provider: CalendarProviderName) => void) | undefined;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// The hook's own behavior is covered by the Settings calendar tests.
jest.mock('../../calendar/hooks/useCalendarConnection', () => ({
  useCalendarConnection: ({
    onConnected,
  }: {
    onConnected: (provider: CalendarProviderName) => void;
  }) => {
    mockOnConnected = onConnected;

    return {
      ...mockConnectionState,
      googleEmail: null,
      connectApple: mockConnectApple,
      connectGoogle: mockConnectGoogle,
      disconnectGoogle: jest.fn(),
    };
  },
}));

describe('ConnectCalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockConnectionState = {
      appleConnected: false,
      googleConnected: false,
      isConnectingApple: false,
      isConnectingGoogle: false,
    };
  });

  it('starts the Apple and Google connections from their buttons', async () => {
    await render(<ConnectCalendarScreen />);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Connect Apple Calendar' }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Connect Google Calendar' }),
    );

    expect(mockConnectApple).toHaveBeenCalledTimes(1);
    expect(mockConnectGoogle).toHaveBeenCalledTimes(1);
  });

  it('moves to the last step once a calendar connects', async () => {
    await render(<ConnectCalendarScreen />);

    await act(async () => {
      mockOnConnected?.('Apple');
    });

    expect(mockNavigate).toHaveBeenCalledWith('OnboardingComplete', {
      calendarConnected: true,
    });
  });

  it('shows "Almost there" while Google sign-in is open', async () => {
    mockConnectionState.isConnectingGoogle = true;

    await render(<ConnectCalendarScreen />);

    expect(screen.getByText('Almost there')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'We just need permission to access your Google Calendar so RISE can import your classes and help you stay on track.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Connect Apple Calendar' }),
    ).not.toBeOnTheScreen();
  });

  it('skips with whether a calendar was already connected', async () => {
    await render(<ConnectCalendarScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));

    expect(mockNavigate).toHaveBeenCalledWith('OnboardingComplete', {
      calendarConnected: false,
    });
  });
});
