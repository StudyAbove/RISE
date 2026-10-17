import { Alert } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { OnboardingCompleteScreen } from '../screens/OnboardingCompleteScreen';

const mockMarkOnboardingCompleted = jest.fn();

let mockRouteParams = { calendarConnected: true };

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../../../repositories/profileRepository', () => ({
  markOnboardingCompleted: (...args: unknown[]) =>
    mockMarkOnboardingCompleted(...args),
}));

describe('OnboardingCompleteScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    mockRouteParams = { calendarConnected: true };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows which setup steps are done', async () => {
    await render(<OnboardingCompleteScreen onComplete={jest.fn()} />);

    expect(
      screen.getByLabelText('Calendar connected, done'),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Classes synced, not set up yet'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Study plan ready, done')).toBeOnTheScreen();
  });

  it('leaves the calendar unchecked when the student skipped it', async () => {
    mockRouteParams = { calendarConnected: false };

    await render(<OnboardingCompleteScreen onComplete={jest.fn()} />);

    expect(
      screen.getByLabelText('Calendar connected, not set up yet'),
    ).toBeOnTheScreen();
  });

  it('saves that onboarding is finished, then opens the app', async () => {
    const onComplete = jest.fn();
    mockMarkOnboardingCompleted.mockResolvedValueOnce(undefined);

    await render(<OnboardingCompleteScreen onComplete={onComplete} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Show me my week' }));

    await waitFor(() => {
      expect(mockMarkOnboardingCompleted).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('stays on the screen when saving fails', async () => {
    const onComplete = jest.fn();
    mockMarkOnboardingCompleted.mockRejectedValueOnce(new Error('offline'));

    await render(<OnboardingCompleteScreen onComplete={onComplete} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Show me my week' }));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Unable to continue',
        'Something went wrong while finishing onboarding. Please try again.',
      );
    });

    expect(onComplete).not.toHaveBeenCalled();
  });
});
