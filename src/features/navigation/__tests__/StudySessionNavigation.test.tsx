import { Text, View } from 'react-native';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { BackButton } from '../../../components/BackButton';
import type { Assignment } from '../../../repositories/assignmentsRepository';
import type { Microtask } from '../../../repositories/microtasksRepository';
import { AssignmentDetailsScreen } from '../../assignments/screens/AssignmentDetailsScreen';
import { FocusSessionScreen } from '../../studySessions/screens/FocusSessionScreen';
import type { RootStackParamList } from '../types';

const mockFetchAssignmentById = jest.fn();
const mockFetchMicrotasks = jest.fn();
const mockSetCompleted = jest.fn();

// Sample records simulate storage; these tests never access real students.
let mockSavedTasks: Microtask[] = [];

jest.mock('../../../repositories/assignmentsRepository', () => ({
  fetchAssignmentById: (assignmentId: string) =>
    mockFetchAssignmentById(assignmentId),
}));

jest.mock('../../../repositories/microtasksRepository', () => ({
  fetchMicrotasks: (assignmentId: string) =>
    mockFetchMicrotasks(assignmentId),
  requestMicrotaskGeneration: async () => ({
    status: 'ready',
    created: false,
  }),
  setMicrotaskCompleted: (
    assignmentId: string,
    taskId: string,
    completed: boolean,
  ) => mockSetCompleted(assignmentId, taskId, completed),
  MicrotaskGenerationError: class extends Error {},
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

function makeTasks(assignmentId: string): Microtask[] {
  return [
    {
      id: `${assignmentId}-first`,
      assignmentId,
      title: 'Organize notes',
      position: 1,
      estimatedMinutes: 15,
      completed: false,
      sourceBasis: 'test-basis',
      planTotalMinutes: 60,
    },
    {
      id: `${assignmentId}-second`,
      assignmentId,
      title: 'Complete the remaining work',
      position: 2,
      estimatedMinutes: 45,
      completed: false,
      sourceBasis: 'test-basis',
      planTotalMinutes: 60,
    },
  ];
}

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
    name: /Step 1\. Organize notes/,
  });

  return navigationRef;
}

async function startSession(
  assignment: Assignment,
  selectBoth = false,
) {
  await fireEvent.press(
    screen.getByRole('button', {
      name: /Step 1\. Organize notes/,
    }),
  );

  if (selectBoth) {
    await fireEvent.press(
      screen.getByRole('button', {
        name: /Step 2\. Complete the remaining work/,
      }),
    );
  }

  await fireEvent.press(
    screen.getByRole('button', {
      name: `Start study session for ${assignment.title}`,
    }),
  );

  await screen.findByText('Focus Session');
}

async function openDonePopup() {
  await fireEvent.press(
    screen.getByRole('button', {
      name: 'Done studying current task',
    }),
  );

  await screen.findByText('Did you finish this task?');
}

async function endWithoutCompleting() {
  await openDonePopup();

  await fireEvent.press(
    screen.getByRole('button', {
      name: 'End study session',
    }),
  );
}

beforeEach(() => {
  mockSavedTasks = assignments.flatMap((assignment) =>
    makeTasks(assignment.id),
  );

  mockFetchAssignmentById.mockReset();
  mockFetchMicrotasks.mockReset();
  mockSetCompleted.mockReset();

  mockFetchAssignmentById.mockImplementation(
    async (assignmentId: string) =>
      assignments.find((assignment) => assignment.id === assignmentId) ??
      null,
  );

  mockFetchMicrotasks.mockImplementation(
    async (assignmentId: string) =>
      mockSavedTasks
        .filter((task) => task.assignmentId === assignmentId)
        .map((task) => ({ ...task })),
  );

  mockSetCompleted.mockImplementation(
    async (
      assignmentId: string,
      taskId: string,
      completed: boolean,
    ) => {
      const task = mockSavedTasks.find(
        (savedTask) =>
          savedTask.id === taskId &&
          savedTask.assignmentId === assignmentId,
      );

      if (!task) throw new Error('Task unavailable');

      task.completed = completed;
      return completed;
    },
  );
});

describe('returning from a study session (#51)', () => {
  describe.each(assignments)('$title', (assignment) => {
    it.each(['Back', 'Done'])(
      '%s returns to the original assignment without completing tasks',
      async (action) => {
        const navigationRef = await openAssignment(assignment);
        await startSession(assignment);

        expect(navigationRef.getCurrentRoute()).toMatchObject({
          name: 'FocusSession',
          params: {
            assignmentId: assignment.id,
            assignmentTitle: assignment.title,
            microtasks: [
              {
                id: `${assignment.id}-first`,
                estimatedMinutes: 15,
              },
            ],
          },
        });

        if (action === 'Back') {
          await fireEvent.press(
            screen.getByRole('button', {
              name: 'Back to assignment',
            }),
          );
        } else {
          await endWithoutCompleting();
        }

        await waitFor(() => {
          expect(navigationRef.getCurrentRoute()).toMatchObject({
            name: 'AssignmentDetails',
            params: { assignmentId: assignment.id },
          });
        });

        expect(
          await screen.findByText(`Instructions for ${assignment.title}.`),
        ).toBeTruthy();

        expect(mockSetCompleted).not.toHaveBeenCalled();
      },
    );

    it('preserves the original assignment through a break round trip', async () => {
      const navigationRef = await openAssignment(assignment);
      await startSession(assignment);

      await fireEvent.press(
        screen.getByRole('button', { name: 'Take a break' }),
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
          params: { assignmentId: assignment.id },
        });
      });

      expect(screen.getByText('Task 1 of 1')).toBeTruthy();

      await endWithoutCompleting();

      await waitFor(() => {
        expect(navigationRef.getCurrentRoute()).toMatchObject({
          name: 'AssignmentDetails',
          params: { assignmentId: assignment.id },
        });
      });

      expect(mockSetCompleted).not.toHaveBeenCalled();
    });
  });
});

describe('selected task queue and completion (#89, #44)', () => {
  const assignment = assignments[0];

  it('requires selection before starting a session', async () => {
    await openAssignment(assignment);

    expect(
      screen.getByRole('button', {
        name: `Start study session for ${assignment.title}`,
      }).props.accessibilityState.disabled,
    ).toBe(true);

    await fireEvent.press(
      screen.getByRole('button', {
        name: /Step 1\. Organize notes/,
      }),
    );

    expect(
      screen.getByRole('button', {
        name: `Start study session for ${assignment.title}`,
      }).props.accessibilityState.disabled,
    ).toBe(false);
  });

  it('shows each task’s own duration and can skip without completing', async () => {
    await openAssignment(assignment);
    await startSession(assignment, true);

    expect(screen.getByText('Task 1 of 2')).toBeTruthy();
    expect(screen.getByText('15:00')).toBeTruthy();

    await openDonePopup();

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Continue to next task',
      }),
    );

    expect(await screen.findByText('Task 2 of 2')).toBeTruthy();
    expect(screen.getByText('45:00')).toBeTruthy();
    expect(mockSetCompleted).not.toHaveBeenCalled();

    await endWithoutCompleting();

    expect(await screen.findByText('0 / 2 tasks')).toBeTruthy();
  });

  it('saves only the confirmed task and supports undo after returning', async () => {
    await openAssignment(assignment);
    await startSession(assignment, true);
    await openDonePopup();

    await fireEvent.press(screen.getByRole('checkbox'));

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Continue to next task',
      }),
    );

    expect(await screen.findByText('Task 2 of 2')).toBeTruthy();

    expect(mockSetCompleted).toHaveBeenCalledWith(
      assignment.id,
      `${assignment.id}-first`,
      true,
    );

    await endWithoutCompleting();

    expect(await screen.findByText('1 / 2 tasks')).toBeTruthy();
    expect(mockSetCompleted).toHaveBeenCalledTimes(1);

    await fireEvent.press(
      screen.getByRole('button', {
        name: /Step 1\. Organize notes/,
      }),
    );

    expect(await screen.findByText('0 / 2 tasks')).toBeTruthy();

    expect(mockSetCompleted).toHaveBeenLastCalledWith(
      assignment.id,
      `${assignment.id}-first`,
      false,
    );
  });

  it('keeps the current task and popup after a failed completion save', async () => {
    mockSetCompleted.mockRejectedValueOnce(new Error('Connection failed'));

    await openAssignment(assignment);
    await startSession(assignment, true);
    await openDonePopup();

    await fireEvent.press(screen.getByRole('checkbox'));

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Continue to next task',
      }),
    );

    expect(
      await screen.findByText(
        'Couldn’t save task completion. Please try again.',
      ),
    ).toBeTruthy();

    expect(
      screen.getByRole('checkbox').props.accessibilityState.checked,
    ).toBe(true);

    expect(mockSavedTasks[0].completed).toBe(false);

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Continue to next task',
      }),
    );

    expect(await screen.findByText('Task 2 of 2')).toBeTruthy();
    expect(mockSavedTasks[0].completed).toBe(true);
  });

  it('waits for completion to save before returning to the assignment', async () => {
    let finishSave!: () => void;

    mockSetCompleted.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finishSave = () => {
            mockSavedTasks[0].completed = true;
            resolve(true);
          };
        }),
    );

    const navigationRef = await openAssignment(assignment);
    await startSession(assignment);
    await openDonePopup();

    await fireEvent.press(screen.getByRole('checkbox'));

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'End study session',
      }),
    );

    expect(navigationRef.getCurrentRoute()?.name).toBe('FocusSession');
    expect(screen.getByText('Saving…')).toBeTruthy();

    await act(async () => {
      finishSave();
    });

    await waitFor(() => {
      expect(navigationRef.getCurrentRoute()?.name).toBe(
        'AssignmentDetails',
      );
    });

    expect(await screen.findByText('1 / 2 tasks')).toBeTruthy();
  });
});