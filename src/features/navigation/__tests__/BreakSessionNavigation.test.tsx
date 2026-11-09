import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { TakeABreakScreen } from '../../breaks/screens/TakeABreakScreen';
import { BreakSessionScreen } from '../../breaks/screens/BreakSessionScreen';
import { FocusSessionScreen } from '../../studySessions/screens/FocusSessionScreen';
import type { RootStackParamList } from '../types';

const mockSetCompleted = jest.fn();

jest.mock('../../../repositories/microtasksRepository', () => ({
  setMicrotaskCompleted: (...args: unknown[]) =>
    mockSetCompleted(...args),
}));

// Only the slider animation is simulated here.
// Its actual gesture behavior is covered by the slider's own tests.
jest.mock('../../breaks/components/StartSessionSlider', () => {
  const { Pressable, Text } = require('react-native');

  return {
    StartSessionSlider: ({
      onComplete,
    }: {
      onComplete?: () => void;
    }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Finish sliding to start break"
        onPress={onComplete}
      >
        <Text>Finish slider</Text>
      </Pressable>
    ),
  };
});

const Stack = createNativeStackNavigator<RootStackParamList>();

async function advanceTime(milliseconds: number) {
  await act(async () => {
    jest.advanceTimersByTime(milliseconds);
  });
}

async function openFocusSession() {
  const navigationRef =
    createNavigationContainerRef<RootStackParamList>();

  await render(
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="FocusSession"
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen
          name="FocusSession"
          component={FocusSessionScreen}
          initialParams={{
            assignmentId: 'test-assignment',
            assignmentTitle: 'Test Lab Report',
            microtasks: [
              {
                id: 'test-task',
                title: 'Organize notes',
                estimatedMinutes: 15,
              },
            ],
          }}
        />

        <Stack.Screen
          name="TakeABreak"
          component={TakeABreakScreen}
        />

        <Stack.Screen
          name="BreakSession"
          component={BreakSessionScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>,
  );

  await screen.findByText('15:00');

  return navigationRef;
}

async function startBreak(label: string) {
  await fireEvent.press(
    screen.getByRole('button', { name: 'Take a break' }),
  );

  await fireEvent.press(
    await screen.findByRole('tab', {
      name: `${label} break`,
    }),
  );

  await fireEvent.press(
    screen.getByRole('button', {
      name: 'Finish sliding to start break',
    }),
  );

  await screen.findByText('Break Session');
}

describe('break countdown navigation (#23)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSetCompleted.mockReset();
  });

  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
  });

  it.each([
    ['Stretch', 'stretch', '15:00'],
    ['Hydrate', 'hydrate', '5:00'],
    ['Walk', 'walk', '15:00'],
  ])(
    'returns from %s to the same paused focus task',
    async (label, breakId, expectedTime) => {
      const navigationRef = await openFocusSession();

      await advanceTime(30 * 1000);

      expect(screen.getByText('14:30')).toBeTruthy();
      expect(
        screen.getByText('Total study time: 0:30'),
      ).toBeTruthy();

      await startBreak(label);

      expect(navigationRef.getCurrentRoute()).toMatchObject({
        name: 'BreakSession',
        params: { breakId },
      });
      expect(screen.getByText(expectedTime)).toBeTruthy();

      // The selection screen is replaced, rather than left beneath
      // the timer where it would interrupt returning to Focus.
      expect(
        navigationRef.getRootState()?.routes.map((route) => route.name),
      ).toEqual(['FocusSession', 'BreakSession']);

      await advanceTime(60 * 1000);

      await fireEvent.press(
        screen.getByRole('button', {
          name: 'Return from break',
        }),
      );

      await waitFor(() => {
        expect(navigationRef.getCurrentRoute()).toMatchObject({
          name: 'FocusSession',
          params: {
            assignmentId: 'test-assignment',
            microtasks: [{ id: 'test-task' }],
          },
        });
      });

      expect(screen.getByText('Task 1 of 1')).toBeTruthy();
      expect(screen.getByText('Organize notes')).toBeTruthy();
      expect(screen.getByText('14:30')).toBeTruthy();
      expect(
        screen.getByText('Total study time: 0:30'),
      ).toBeTruthy();

      // Focus resumes without counting the minute spent on break.
      await advanceTime(1000);

      expect(screen.getByText('14:29')).toBeTruthy();
      expect(
        screen.getByText('Total study time: 0:31'),
      ).toBeTruthy();
      expect(mockSetCompleted).not.toHaveBeenCalled();
    },
  );
    it('automatically resumes the same focus task when the break expires', async () => {
    const navigationRef = await openFocusSession();

    await advanceTime(30 * 1000);
    await startBreak('Hydrate');

    await advanceTime(5 * 60 * 1000 - 1000);
    expect(navigationRef.getCurrentRoute()?.name).toBe('BreakSession');
    expect(screen.getByText('0:01')).toBeTruthy();

    await advanceTime(1000);

    expect(navigationRef.getCurrentRoute()).toMatchObject({
      name: 'FocusSession',
      params: {
        assignmentId: 'test-assignment',
        microtasks: [{ id: 'test-task' }],
      },
    });
    expect(screen.getByText('Organize notes')).toBeTruthy();
    expect(screen.getByText('14:30')).toBeTruthy();
    expect(screen.getByText('Total study time: 0:30')).toBeTruthy();
    expect(mockSetCompleted).not.toHaveBeenCalled();

    await advanceTime(1000);
    expect(screen.getByText('14:29')).toBeTruthy();
  });
});