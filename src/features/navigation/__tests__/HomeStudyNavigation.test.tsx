import { View } from 'react-native';
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

import type { Assignment } from '../../../repositories/assignmentsRepository';
import type { Microtask } from '../../../repositories/microtasksRepository';
import { AssignmentCard } from '../../assignments/components/AssignmentCard';
import { AssignmentDetailsScreen } from '../../assignments/screens/AssignmentDetailsScreen';
import { FocusSessionScreen } from '../../studySessions/screens/FocusSessionScreen';
import type { RootStackParamList } from '../types';

const mockFetchAssignment = jest.fn();
const mockFetchTasks = jest.fn();
const mockGenerate = jest.fn();
const mockComplete = jest.fn();

jest.mock('../../../repositories/assignmentsRepository', () => ({
  fetchAssignmentById: (id: string) => mockFetchAssignment(id),
}));

jest.mock('../../../repositories/microtasksRepository', () => ({
  fetchMicrotasks: (id: string) => mockFetchTasks(id),
  requestMicrotaskGeneration: (id: string) => mockGenerate(id),
  setMicrotaskCompleted: (
    assignmentId: string,
    taskId: string,
    completed: boolean,
  ) => mockComplete(assignmentId, taskId, completed),
  MicrotaskGenerationError: class extends Error {},
}));

jest.mock('../../../repositories/studySessionsRepository', () => ({
  getStudySecondsForAssignment: async () => 0,
  recordStudySession: async () => undefined,
}));

jest.mock('../../../hooks/useCurrentDate', () => ({
  useCurrentDate: () => new Date(2026, 10, 9, 12),
}));

const now = new Date(2026, 10, 9, 12);
const Stack = createNativeStackNavigator<RootStackParamList>();

function makeAssignment(id: string, title: string): Assignment {
  return {
    id,
    title,
    description: `Instructions for ${title}.`,
    dueAt: new Date(2026, 10, 9, 23, 59),
    completed: false,
    source: 'canvas',
    courseName: 'Biology',
    courseCode: 'BIO 200',
    courseColor: '#A8BEA3',
    courseTint: '#EAF0E8',
    pointsPossible: null,
    htmlUrl: null,
    estimatedMinutes: 60,
    kind: 'homework',
  };
}

const assignments = [
  makeAssignment('assignment-a', 'Lab Report'),
  makeAssignment('assignment-b', 'Problem Set'),
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
      title: 'Write the answers',
      position: 2,
      estimatedMinutes: 45,
      completed: false,
      sourceBasis: 'test-basis',
      planTotalMinutes: 60,
    },
  ];
}

let savedTasks: Microtask[] = [];

// Use real Home-style cards without loading unrelated Home features.
function HomeCards() {
  return (
    <View>
      {assignments.map((assignment) => (
        <AssignmentCard
          key={assignment.id}
          assignment={assignment}
          today={now}
          variant="home"
        />
      ))}
    </View>
  );
}

async function openHome() {
  const navigationRef =
    createNavigationContainerRef<RootStackParamList>();

  await render(
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{ headerShown: false, animation: 'none' }}
      >
        <Stack.Screen name="MainTabs" component={HomeCards} />
        <Stack.Screen
          name="AssignmentDetails"
          component={AssignmentDetailsScreen}
        />
        <Stack.Screen
          name="FocusSession"
          component={FocusSessionScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>,
  );

  return navigationRef;
}

async function chooseAssignment(assignment: Assignment) {
  await fireEvent.press(
    screen.getByRole('button', {
      name: new RegExp(`^${assignment.title}\\.`),
    }),
  );

  await screen.findByText('Choose tasks to study');

  await screen.findByRole('button', {
    name: /Step 1\. Organize notes/,
  });
}

async function startSelected(assignment: Assignment) {
  await fireEvent.press(
    screen.getByRole('button', {
      name: `Start selected tasks for ${assignment.title}`,
    }),
  );

  await screen.findByText('Focus Session');
}

async function finishSession(completeTask = false) {
  await fireEvent.press(
    screen.getByRole('button', {
      name: 'Done studying current task',
    }),
  );

  await screen.findByText('Did you finish this task?');

  if (completeTask) {
    await fireEvent.press(screen.getByRole('checkbox'));
  }

  await fireEvent.press(
    screen.getByRole('button', { name: 'Finish Study Session' }),
  );
}

beforeEach(() => {
  savedTasks = assignments.flatMap((assignment) =>
    makeTasks(assignment.id),
  );

  mockFetchAssignment.mockReset();
  mockFetchTasks.mockReset();
  mockGenerate.mockReset();
  mockComplete.mockReset();

  mockFetchAssignment.mockImplementation(async (id: string) =>
    assignments.find((assignment) => assignment.id === id) ?? null,
  );

  mockFetchTasks.mockImplementation(async (id: string) =>
    savedTasks
      .filter((task) => task.assignmentId === id)
      .map((task) => ({ ...task })),
  );

  mockGenerate.mockResolvedValue({ status: 'ready', created: false });

  mockComplete.mockImplementation(
    async (assignmentId: string, taskId: string, completed: boolean) => {
      const task = savedTasks.find(
        (item) =>
          item.assignmentId === assignmentId && item.id === taskId,
      );

      if (!task) throw new Error('Task unavailable');

      task.completed = completed;
      return completed;
    },
  );
});

describe('starting from a Home card (#60)', () => {
  it.each(assignments)(
    'opens the selected task for $title and returns to its details',
    async (assignment) => {
      const navigationRef = await openHome();
      await chooseAssignment(assignment);

      expect(
        screen.getByRole('button', {
          name: `Start selected tasks for ${assignment.title}`,
        }).props.accessibilityState.disabled,
      ).toBe(true);

      // The popup offers selection, not completion controls.
      expect(
        screen.queryByRole('button', {
          name: 'Mark Step 1 complete',
        }),
      ).toBeNull();

      await fireEvent.press(
        screen.getByRole('button', {
          name: /Step 2\. Write the answers/,
        }),
      );

      expect(mockComplete).not.toHaveBeenCalled();

      await startSelected(assignment);

      expect(navigationRef.getCurrentRoute()).toMatchObject({
        name: 'FocusSession',
        params: {
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          microtasks: [
            {
              id: `${assignment.id}-second`,
              title: 'Write the answers',
              estimatedMinutes: 45,
            },
          ],
        },
      });

      expect(screen.getByText('Task 1 of 1')).toBeTruthy();
      expect(screen.getByText('45:00')).toBeTruthy();

      await finishSession(true);

      await waitFor(() => {
        expect(navigationRef.getCurrentRoute()).toMatchObject({
          name: 'AssignmentDetails',
          params: {
            assignmentId: assignment.id,
            selectTasks: false,
          },
        });
      });

      expect(await screen.findByText('1 / 2 tasks')).toBeTruthy();
      expect(
        screen.getByText(`Instructions for ${assignment.title}.`),
      ).toBeTruthy();
      expect(screen.getByText('Organize notes')).toBeTruthy();
      expect(screen.getByText('Write the answers')).toBeTruthy();
      expect(screen.queryByText('Choose tasks to study')).toBeNull();

      expect(mockComplete).toHaveBeenCalledTimes(1);
      expect(mockComplete).toHaveBeenCalledWith(
        assignment.id,
        `${assignment.id}-second`,
        true,
      );
    },
  );

  it('ends without completing a task when completion is unchecked', async () => {
    const assignment = assignments[0];
    await openHome();
    await chooseAssignment(assignment);

    await fireEvent.press(
      screen.getByRole('button', {
        name: /Step 1\. Organize notes/,
      }),
    );

    await startSelected(assignment);
    await finishSession();

    expect(await screen.findByText('0 / 2 tasks')).toBeTruthy();
    expect(mockComplete).not.toHaveBeenCalled();
    expect(screen.queryByText('Choose tasks to study')).toBeNull();
  });

  it('can close selection and view the assignment without starting', async () => {
    const assignment = assignments[0];
    const navigationRef = await openHome();
    await chooseAssignment(assignment);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Close task selection' }),
    );

    expect(
      await screen.findByRole('button', {
        name: `Start study session for ${assignment.title}`,
      }),
    ).toBeTruthy();

    expect(navigationRef.getCurrentRoute()?.name).toBe(
      'AssignmentDetails',
    );
    expect(screen.queryByText('Choose tasks to study')).toBeNull();
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it('does not offer completed microtasks for selection', async () => {
    savedTasks[0].completed = true;

    await openHome();

    await fireEvent.press(
      screen.getByRole('button', { name: /^Lab Report\./ }),
    );

    await screen.findByRole('button', {
      name: /Step 2\. Write the answers/,
    });

    expect(
      screen.queryByRole('button', {
        name: /Step 1\. Organize notes/,
      }),
    ).toBeNull();

    expect(mockComplete).not.toHaveBeenCalled();
  });
});