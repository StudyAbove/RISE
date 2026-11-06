import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/types';
import { BreakSessionScreen } from '../screens/BreakSessionScreen';

const mockGoBack = jest.fn();
let mockIsFocused = true;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');

  return {
    ...actual,
    useIsFocused: () => mockIsFocused,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

type Props = NativeStackScreenProps<
  RootStackParamList,
  'BreakSession'
>;

function breakScreen(breakId: string) {
  const props = {
    route: {
      key: 'break-session-test',
      name: 'BreakSession',
      params: { breakId },
    },
    navigation: {
      goBack: mockGoBack,
    },
  } as unknown as Props;

  return <BreakSessionScreen {...props} />;
}

async function advanceTime(milliseconds: number) {
  await act(async () => {
    jest.advanceTimersByTime(milliseconds);
  });
}

describe('BreakSessionScreen (#23)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGoBack.mockReset();
    mockIsFocused = true;
  });

  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
  });

  it.each([
    ['stretch', '15:00', '15-minute break'],
    ['hydrate', '5:00', '5-minute break'],
    ['walk', '15:00', '15-minute break'],
  ])(
    'starts %s with its saved duration',
    async (breakId, timerText, durationText) => {
      await render(breakScreen(breakId));

      expect(screen.getByText(timerText)).toBeTruthy();
      expect(screen.getByText(durationText)).toBeTruthy();
      expect(mockGoBack).not.toHaveBeenCalled();
    },
  );

  it('counts down in seconds', async () => {
    await render(breakScreen('hydrate'));

    await advanceTime(1000);
    expect(screen.getByText('4:59')).toBeTruthy();

    await advanceTime(9000);
    expect(screen.getByText('4:50')).toBeTruthy();
  });

  it('stops at zero and waits for the student to return', async () => {
    await render(breakScreen('hydrate'));

    await advanceTime(5 * 60 * 1000);

    expect(screen.getByText('0:00')).toBeTruthy();
    expect(
      screen.getByText(
        'Your break is finished. Ready to get back?',
      ),
    ).toBeTruthy();
    expect(mockGoBack).not.toHaveBeenCalled();

    await advanceTime(60 * 1000);

    expect(screen.getByText('0:00')).toBeTruthy();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('allows returning before the break finishes', async () => {
    await render(breakScreen('walk'));

    await advanceTime(30 * 1000);

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Return from break',
      }),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('allows returning after the break finishes', async () => {
    await render(breakScreen('hydrate'));

    await advanceTime(5 * 60 * 1000);

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Return from break',
      }),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('preserves remaining time while the screen is unfocused', async () => {
    const view = await render(breakScreen('hydrate'));

    await advanceTime(10 * 1000);
    expect(screen.getByText('4:50')).toBeTruthy();

    mockIsFocused = false;
    await view.rerender(breakScreen('hydrate'));

    await advanceTime(30 * 1000);
    expect(screen.getByText('4:50')).toBeTruthy();

    mockIsFocused = true;
    await view.rerender(breakScreen('hydrate'));

    await advanceTime(1000);
    expect(screen.getByText('4:49')).toBeTruthy();
  });

  it('handles an unknown break without starting a countdown', async () => {
    await render(breakScreen('unknown-break'));

    expect(
      screen.getByRole('alert'),
    ).toBeTruthy();
    expect(screen.queryByText('0:00')).toBeNull();

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Return from break',
      }),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});