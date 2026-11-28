import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import {
  AppTourController,
  requestAppTourReplay,
} from '../AppTourController';
import { readTourChoice, saveTourChoice } from '../tourStorage';

const mockStore = new Map<string, string>();
let mockUserId: string | null = 'student-a';

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStore.set(key, value);
    }),
  },
}));

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({
        data: {
          session: mockUserId ? { user: { id: mockUserId } } : null,
        },
        error: null,
      })),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: { unsubscribe: jest.fn() },
        },
      })),
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
}));

const mockNavigate = jest.fn();

async function openTour() {
  const navigation = {
    navigate: mockNavigate,
  } as unknown as BottomTabBarProps['navigation'];

  return render(<AppTourController navigation={navigation} />);
}

beforeEach(() => {
  mockStore.clear();
  mockUserId = 'student-a';
  mockNavigate.mockReset();
});

describe('optional app tour (#21)', () => {
  it('offers the tour without starting it automatically', async () => {
    await openTour();

    expect(await screen.findByText('Welcome to RISE')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Take a quick tour' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Maybe later' }),
    ).toBeTruthy();

    expect(screen.queryByText('1 of 5')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('remembers Maybe later after reopening', async () => {
    const view = await openTour();

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Maybe later' }),
    );

    expect(screen.queryByText('Welcome to RISE')).toBeNull();
    expect(await readTourChoice('student-a')).toBe('later');
    expect(mockNavigate).toHaveBeenLastCalledWith('Home');

    await view.unmount();
    await openTour();

    expect(screen.queryByText('Welcome to RISE')).toBeNull();
  });

  it('starts on Home and supports Next and Back', async () => {
    await openTour();

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Take a quick tour' }),
    );

    expect(screen.getByText('Your day at a glance')).toBeTruthy();
    expect(screen.getByText('1 of 5')).toBeTruthy();
    expect(await readTourChoice('student-a')).toBe('started');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Next' }),
    );

    expect(screen.getByText('See your schedule')).toBeTruthy();
    expect(
      screen.getByText('Keep classes, deadlines, and plans in one place.'),
    ).toBeTruthy();
    expect(mockNavigate).toHaveBeenLastCalledWith('Calendar');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Back' }),
    );

    expect(screen.getByText('1 of 5')).toBeTruthy();
    expect(mockNavigate).toHaveBeenLastCalledWith('Home');
  });

  it('visits all five tabs and remembers finishing', async () => {
    const view = await openTour();

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Take a quick tour' }),
    );

    for (const tab of ['Calendar', 'Study', 'List', 'Analytics']) {
      await fireEvent.press(
        screen.getByRole('button', { name: 'Next' }),
      );

      expect(mockNavigate).toHaveBeenLastCalledWith(tab);

      if (tab === 'List') {
        expect(
          screen.getByText('All your assignments, organized in one place.'),
        ).toBeTruthy();
      }
    }

    expect(screen.getByText('5 of 5')).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Let’s get started' }),
    );

    expect(await readTourChoice('student-a')).toBe('finished');
    expect(mockNavigate).toHaveBeenLastCalledWith('Home');
    expect(screen.queryByText('5 of 5')).toBeNull();

    await view.unmount();
    await openTour();

    expect(screen.queryByText('Welcome to RISE')).toBeNull();
  });

  it('allows skipping and remembers that choice', async () => {
    await openTour();

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Take a quick tour' }),
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Skip app tour' }),
    );

    expect(await readTourChoice('student-a')).toBe('skipped');
    expect(screen.queryByText('1 of 5')).toBeNull();
    expect(mockNavigate).toHaveBeenLastCalledWith('Home');
  });

  it('keeps preferences separate between accounts', async () => {
    await saveTourChoice('student-a', 'finished');
    mockUserId = 'student-b';

    await openTour();

    expect(await screen.findByText('Welcome to RISE')).toBeTruthy();
    expect(await readTourChoice('student-a')).toBe('finished');
    expect(await readTourChoice('student-b')).toBeNull();
  });

  it('does not invite signed-out users', async () => {
    mockUserId = null;

    await openTour();

    expect(screen.queryByText('Welcome to RISE')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('can replay after the invitation was previously dismissed', async () => {
    await saveTourChoice('student-a', 'later');
    await openTour();

    await act(async () => {
      requestAppTourReplay();
    });

    expect(screen.getByText('Your day at a glance')).toBeTruthy();
    expect(screen.getByText('1 of 5')).toBeTruthy();
    expect(mockNavigate).toHaveBeenLastCalledWith('Home');
  });

  it('rejects saving without an account ID', async () => {
    await expect(saveTourChoice('', 'finished')).rejects.toThrow(
      'A signed-in account is required.',
    );
  });
});