import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { recordBreakSession } from '../../../repositories/breakSessionsRepository';
import type { RootStackParamList } from '../../navigation/types';
import { BreakSessionScreen } from '../screens/BreakSessionScreen';

jest.mock('../../../repositories/breakSessionsRepository', () => ({
  recordBreakSession: jest.fn(),
}));

let mockIsFocused = true;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => mockIsFocused,
}));

const mockRecord = jest.mocked(recordBreakSession);
const mockGoBack = jest.fn();
let beforeRemove: (() => void) | undefined;

const mockNavigation = {
  goBack: mockGoBack,
  addListener: jest.fn((event: string, callback: () => void) => {
    if (event === 'beforeRemove') beforeRemove = callback;
    return jest.fn();
  }),
};

type Props = NativeStackScreenProps<RootStackParamList, 'BreakSession'>;

function breakScreen(breakId = 'hydrate', assignmentId = 'assignment-a') {
  const props = {
    route: {
      key: 'unique-break-session',
      name: 'BreakSession',
      params: { breakId, assignmentId },
    },
    navigation: mockNavigation,
  } as unknown as Props;

  return <BreakSessionScreen {...props} />;
}

async function advanceTime(milliseconds: number) {
  await act(async () => {
    jest.advanceTimersByTime(milliseconds);
  });
}

async function returnEarly() {
  await fireEvent.press(
    screen.getByRole('button', { name: 'Return from break' }),
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  mockIsFocused = true;
  beforeRemove = undefined;
  mockGoBack.mockReset();
  mockRecord.mockReset();
  mockRecord.mockResolvedValue(true);
});

afterEach(async () => {
  await cleanup();
  jest.useRealTimers();
});

describe('recording actual break time (#69)', () => {
  it('does not save just because a break opens', async () => {
    await render(breakScreen());

    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('records actual elapsed time when returning early, only once', async () => {
    const view = await render(breakScreen());

    await advanceTime(45000);
    await returnEarly();
    await returnEarly();
    await act(async () => {
      beforeRemove?.();
    });
    await view.unmount();

    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        clientSessionId: 'unique-break-session',
        assignmentId: 'assignment-a',
        breakType: 'hydrate',
        durationSeconds: 45,
        startedAt: expect.any(Date),
        endedAt: expect.any(Date),
      }),
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('records the completed duration and returns automatically', async () => {
    const view = await render(breakScreen());

    await advanceTime(5 * 60 * 1000);
    await view.unmount();

    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ durationSeconds: 300 }),
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('records a break removed by navigation, without duplicate saving', async () => {
    const view = await render(breakScreen());

    await advanceTime(20000);
    await act(async () => {
      beforeRemove?.();
    });
    await view.unmount();

    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ durationSeconds: 20 }),
    );
  });

  it('excludes time while the screen is unfocused', async () => {
    const view = await render(breakScreen());

    await advanceTime(20000);
    mockIsFocused = false;
    await view.rerender(breakScreen());

    await advanceTime(60000);
    mockIsFocused = true;
    await view.rerender(breakScreen());

    await advanceTime(10000);
    await returnEarly();

    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ durationSeconds: 30 }),
    );
  });

  it('does not record an unavailable break', async () => {
    await render(breakScreen('unknown'));

    await advanceTime(10000);
    await returnEarly();

    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('still returns to studying when saving fails', async () => {
    mockRecord.mockRejectedValueOnce(new Error('Network unavailable'));
    await render(breakScreen());

    await advanceTime(10000);
    await returnEarly();

    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});