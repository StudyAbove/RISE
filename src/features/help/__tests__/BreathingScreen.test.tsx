import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { BreathingScreen } from '../screens/BreathingScreen';
import { BREATHING_TIMING, SESSION_MS } from '../utils/breathingSession';

const mockGoBack = jest.fn();
let mockIsFocused = true;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useIsFocused: () => mockIsFocused,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../components/BackButton', () => ({
  BackButton: () => null,
}));

const { riseMs, inhaleMs, holdMs, settleMs } = BREATHING_TIMING;

/** Moves the fake clock forward, running every animation frame on the way. */
async function wait(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

async function press(name: string) {
  await fireEvent.press(screen.getByRole('button', { name }));
}

async function beginAndRise() {
  await press('Begin');
  await wait(riseMs + 50);
}

beforeEach(() => {
  jest.useFakeTimers();
  mockGoBack.mockClear();
  mockIsFocused = true;
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('BreathingScreen (#71)', () => {
  it('waits for the student to begin', async () => {
    await render(<BreathingScreen />);

    expect(screen.getByText('Ready when you are')).toBeOnTheScreen();
    expect(screen.getByText('Five gentle breaths.')).toBeOnTheScreen();
    expect(screen.getByLabelText('A sun rising and breathing above watercolor hills')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Finish' })).toBeNull();
  });

  it('raises the sun, then guides each breath in, hold and out', async () => {
    await render(<BreathingScreen />);

    await press('Begin');
    expect(screen.getByText('Settle in')).toBeOnTheScreen();

    await wait(riseMs + 50);
    expect(screen.getByText('Breathe in')).toBeOnTheScreen();
    expect(screen.getByText('Breath 1 of 5')).toBeOnTheScreen();

    await wait(inhaleMs);
    expect(screen.getByText('Hold')).toBeOnTheScreen();

    await wait(holdMs);
    expect(screen.getByText('Breathe out')).toBeOnTheScreen();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Breathe out');

    await wait(6000);
    expect(screen.getByText('Breath 2 of 5')).toBeOnTheScreen();
  });

  it('pauses and resumes where the breath left off', async () => {
    await render(<BreathingScreen />);
    await beginAndRise();
    await wait(inhaleMs + 1000);

    await press('Pause');
    expect(screen.getByText('Take your time')).toBeOnTheScreen();

    await wait(30_000);
    expect(screen.getByText('Breath 1 of 5')).toBeOnTheScreen();

    await press('Resume');
    await wait(100);
    expect(screen.getByText('Hold')).toBeOnTheScreen();
  });

  it('pauses when the student leaves the screen', async () => {
    await render(<BreathingScreen />);
    await beginAndRise();

    mockIsFocused = false;
    await screen.rerender(<BreathingScreen />);

    expect(screen.getByRole('button', { name: 'Resume' })).toBeOnTheScreen();
  });

  it('ends after five breaths, and Return to studying goes back', async () => {
    await render(<BreathingScreen />);
    await beginAndRise();

    await wait(SESSION_MS + settleMs + 100);

    expect(screen.getByText('Ready when you are')).toBeOnTheScreen();
    expect(screen.getByText('A little space for the rest of your day.')).toBeOnTheScreen();

    await press('Return to studying');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('can finish early, letting the sun settle first', async () => {
    await render(<BreathingScreen />);
    await beginAndRise();

    await press('Finish');
    expect(screen.getByText('Let your breathing return to its own rhythm.')).toBeOnTheScreen();

    await wait(settleMs + 100);
    expect(screen.getByRole('button', { name: 'Keep breathing' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Return to studying' })).toBeOnTheScreen();
  });

  it('starts again with Keep breathing', async () => {
    await render(<BreathingScreen />);
    await beginAndRise();
    await press('Finish');
    await wait(settleMs + 100);

    await press('Keep breathing');
    await wait(riseMs + 50);

    expect(screen.getByText('Breathe in')).toBeOnTheScreen();
    expect(screen.getByText('Breath 1 of 5')).toBeOnTheScreen();
  });
});
