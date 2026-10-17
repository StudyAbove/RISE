import { Alert } from 'react-native';
import {
  act,
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

// Longer than the whole "Congratulations!" animation.
const CELEBRATION_DURATION = 2000;

/** Renders the screen and lets the celebration play out. */
async function renderPastCelebration(onComplete = jest.fn()) {
  await render(<OnboardingCompleteScreen onComplete={onComplete} />);

  await act(async () => {
    jest.advanceTimersByTime(CELEBRATION_DURATION);
  });
}

describe('OnboardingCompleteScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    mockRouteParams = { calendarConnected: true };
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('celebrates before showing the summary', async () => {
    await render(<OnboardingCompleteScreen onComplete={jest.fn()} />);

    expect(
      screen.getByRole('header', { name: 'Congratulations!' }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('You’re all set')).not.toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(CELEBRATION_DURATION);
    });

    expect(screen.getByText('You’re all set')).toBeOnTheScreen();
  });

  it('shows which setup steps are done', async () => {
    await renderPastCelebration();

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

    await renderPastCelebration();

    expect(
      screen.getByLabelText('Calendar connected, not set up yet'),
    ).toBeOnTheScreen();
  });

  it('saves that onboarding is finished, then opens the app', async () => {
    const onComplete = jest.fn();
    mockMarkOnboardingCompleted.mockResolvedValueOnce(undefined);

    await renderPastCelebration(onComplete);

    await fireEvent.press(screen.getByRole('button', { name: 'Show me my week' }));

    await waitFor(() => {
      expect(mockMarkOnboardingCompleted).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('stays on the screen when saving fails', async () => {
    const onComplete = jest.fn();
    mockMarkOnboardingCompleted.mockRejectedValueOnce(new Error('offline'));

    await renderPastCelebration(onComplete);

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
