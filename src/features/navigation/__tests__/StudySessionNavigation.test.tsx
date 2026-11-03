import { Text, View } from 'react-native';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { BackButton } from '../../../components/BackButton';
import type { Assignment } from '../../../repositories/assignmentsRepository';
import { AssignmentDetailsScreen } from '../../assignments/screens/AssignmentDetailsScreen';
import { FocusSessionScreen } from '../../studySessions/screens/FocusSessionScreen';
import type { RootStackParamList } from '../types';

const mockFetchAssignmentById = jest.fn();

jest.mock('../../../repositories/assignmentsRepository', () => ({
  fetchAssignmentById: (assignmentId: string) =>
    mockFetchAssignmentById(assignmentId),
}));

jest.mock('../../../hooks/useCurrentDate', () => ({
  useCurrentDate: () => new Date(2026, 10, 9, 12, 0),
}));

const Stack = createNativeStackNavigator<RootStackParamList>();

// Sample assignments exist only in this test file.
function makeAssignment(id: string, title: string): Assignment {
  return {
    id,
    title,
    description: `Instructions for ${title}.`,
    dueAt: new Date(2026, 10, 20, 23, 59),
    completed: false,
    source: 'canvas',
    courseName: 'Cell Biology',
    courseCode: 'BIO 200',
    courseColor: '#F28B82',
    courseTint: '#FDE3E0',
    pointsPossible: 50,
    htmlUrl: null,
    estimatedMinutes: 60,
    kind: 'homework',
  };
}

const assignments = [
  makeAssignment('assignment-a', 'Osmosis Lab Report'),
  makeAssignment('assignment-b', 'Problem Set 6'),
];

// Exercise the real shared Back button without loading break-selection UI.
// The partner's actual break screens still need their own device testing.
function BreakScreenForNavigationTest() {
  return (
    <View>
      <BackButton />
      <Text>Break navigation test screen</Text>
    </View>
  );
}

async function openAssignment(assignment: Assignment) {
  const navigationRef =
    createNavigationContainerRef<RootStackParamList>();

  await render(
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="AssignmentDetails"
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen
          name="AssignmentDetails"
          component={AssignmentDetailsScreen}
          initialParams={{ assignmentId: assignment.id }}
        />

        <Stack.Screen
          name="FocusSession"
          component={FocusSessionScreen}
        />

        <Stack.Screen
          name="TakeABreak"
          component={BreakScreenForNavigationTest}
        />
      </Stack.Navigator>
    </NavigationContainer>,
  );

  await screen.findByRole('button', {
    name: `Start study session for ${assignment.title}`,
  });

  return navigationRef;
}

describe('returning from a study session (#51)', () => {
  beforeEach(() => {
    mockFetchAssignmentById.mockReset();

    mockFetchAssignmentById.mockImplementation(
      async (assignmentId: string) =>
        assignments.find((assignment) => assignment.id === assignmentId) ??
        null,
    );
  });

  describe.each(assignments)('$title', (assignment) => {
    it.each([
      ['Back', 'Back to assignment'],
      ['Done', 'Done, return to assignment'],
    ])(
      '%s returns to the original assignment',
      async (_action, accessibilityLabel) => {
        const navigationRef = await openAssignment(assignment);

        await fireEvent.press(
          screen.getByRole('button', {
            name: `Start study session for ${assignment.title}`,
          }),
        );

        await waitFor(() => {
          expect(navigationRef.getCurrentRoute()).toMatchObject({
            name: 'FocusSession',
            params: {
              assignmentId: assignment.id,
              assignmentTitle: assignment.title,
            },
          });
        });

        expect(screen.getByText(assignment.title)).toBeTruthy();

        await fireEvent.press(
          screen.getByRole('button', {
            name: accessibilityLabel,
          }),
        );

        await waitFor(() => {
          expect(navigationRef.getCurrentRoute()).toMatchObject({
            name: 'AssignmentDetails',
            params: { assignmentId: assignment.id },
          });
        });

        // The original assignment is available again after its focus reload.
        expect(
          await screen.findByRole('button', {
            name: `Start study session for ${assignment.title}`,
          }),
        ).toBeTruthy();

        expect(
          screen.getByText(`Instructions for ${assignment.title}.`),
        ).toBeTruthy();
      },
    );

    it('preserves the original assignment through a break round trip', async () => {
      const navigationRef = await openAssignment(assignment);

      await fireEvent.press(
        screen.getByRole('button', {
          name: `Start study session for ${assignment.title}`,
        }),
      );

      await fireEvent.press(
        await screen.findByRole('button', {
          name: 'Take a break',
        }),
      );

      await waitFor(() => {
        expect(navigationRef.getCurrentRoute()?.name).toBe('TakeABreak');
      });

      await fireEvent.press(
        screen.getByRole('button', { name: 'Back' }),
      );

      await waitFor(() => {
        expect(navigationRef.getCurrentRoute()).toMatchObject({
          name: 'FocusSession',
          params: {
            assignmentId: assignment.id,
            assignmentTitle: assignment.title,
          },
        });
      });

      await fireEvent.press(
        screen.getByRole('button', {
          name: 'Done, return to assignment',
        }),
      );

      await waitFor(() => {
        expect(navigationRef.getCurrentRoute()).toMatchObject({
          name: 'AssignmentDetails',
          params: { assignmentId: assignment.id },
        });
      });

      expect(
        await screen.findByRole('button', {
          name: `Start study session for ${assignment.title}`,
        }),
      ).toBeTruthy();
    });
  });
});