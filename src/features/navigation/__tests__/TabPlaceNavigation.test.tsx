import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import { MainTabNavigator } from '../navigators/MainTabNavigator';

let mockAssignmentTitle = 'Assignment A';
const mockFetchAssignment = jest.fn();

jest.mock('../../../repositories/assignmentsRepository', () => ({
  fetchAssignmentById: (id: string) => mockFetchAssignment(id),
  fetchAssignments: jest.fn(async () => []),
}));

jest.mock('../../../repositories/studySessionsRepository', () => ({
  getStudySecondsForAssignment: jest.fn(async () => 0),
}));

// Task loading/completion has separate integration tests.
jest.mock('../../assignments/components/AssignmentMicrotasks', () => ({
  AssignmentMicrotasks: () => null,
}));

jest.mock('../../../repositories/canvasRepository', () => ({
  fetchCanvasCourses: jest.fn(async () => []),
}));

jest.mock('../../../repositories/extensionEmailRepository', () => ({
  ExtensionEmailError: class extends Error {},
  fetchOpenAssignmentsForCourse: jest.fn(async () => []),
  requestExtensionEmail: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => true),
}));

jest.mock('../config/mainTabs', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  const { useNavigation } = require('@react-navigation/native');
  const {
    TabScreenScrollView,
  } = require('../../../components/TabScreenScrollView');

  function createPage(name: string) {
    return function TestMainPage() {
      const navigation = useNavigation();
      const [offset, setOffset] = React.useState(0);

      return (
        <TabScreenScrollView
          testID={`scroll-${name}`}
          onScroll={(event: {
            nativeEvent: { contentOffset: { y: number } };
          }) => setOffset(event.nativeEvent.contentOffset.y)}
        >
          <Text>{`${name} main page`}</Text>
          <Text>{`${name} remembered offset: ${offset}`}</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${name} assignment`}
            onPress={() =>
              navigation.navigate('AssignmentDetails', {
                assignmentId: name === 'List' ? 'b' : 'a',
              })
            }
          >
            <Text>Open assignment</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${name} form`}
            onPress={() => navigation.navigate('ExtensionEmail')}
          >
            <Text>Open extension form</Text>
          </Pressable>
        </TabScreenScrollView>
      );
    };
  }

  return {
    MAIN_TABS: ['Home', 'Calendar', 'Study', 'List', 'Analytics'].map(
      (name) => ({
        name,
        label: name,
        component: createPage(name),
        icon: {
          Filled: () => null,
          Outline: () => null,
          width: 35,
          height: 35,
        },
      }),
    ),
  };
});

function assignment(id: string): Assignment {
  return {
    id,
    title: id === 'a' ? mockAssignmentTitle : 'Assignment B',
    description: 'Assignment instructions.',
    dueAt: null,
    completed: false,
    completedAt: null,
    source: 'rise',
    courseName: null,
    courseCode: null,
    courseColor: '#78927B',
    courseTint: '#DDE9D9',
    pointsPossible: null,
    htmlUrl: null,
    estimatedMinutes: 30,
    kind: 'homework',
    microtasks: [],
  };
}

async function openTabs() {
  return render(
    <NavigationContainer>
      <MainTabNavigator />
    </NavigationContainer>,
  );
}

async function switchTab(name: string) {
  await fireEvent.press(screen.getByRole('tab', { name }));
}

async function openAssignment(tab: string) {
  await fireEvent.press(
    screen.getByRole('button', { name: `Open ${tab} assignment` }),
  );
}

beforeEach(() => {
  mockAssignmentTitle = 'Assignment A';
  mockFetchAssignment.mockReset();
  mockFetchAssignment.mockImplementation(async (id: string) => assignment(id));
});

describe('keeping each tab’s place (#53)', () => {
  it('keeps the scrolled page mounted when switching tabs', async () => {
    await openTabs();

    await fireEvent.scroll(screen.getByTestId('scroll-Home'), {
      nativeEvent: {
        contentOffset: { x: 0, y: 240 },
      },
    });

    await switchTab('List');
    await switchTab('Home');

    expect(
      screen.getByText('Home remembered offset: 240'),
    ).toBeOnTheScreen();
  });

  it('keeps separate assignment details open in two tabs', async () => {
    await openTabs();
    await openAssignment('Home');

    expect(await screen.findByText('Assignment A')).toBeOnTheScreen();

    await switchTab('List');
    await openAssignment('List');

    expect(await screen.findByText('Assignment B')).toBeOnTheScreen();

    await switchTab('Home');
    expect(await screen.findByText('Assignment A')).toBeOnTheScreen();

    await switchTab('List');
    expect(await screen.findByText('Assignment B')).toBeOnTheScreen();
  });

  it('preserves text typed into the real extension form', async () => {
    await openTabs();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Open Home form' }),
    );
    await fireEvent.changeText(
      await screen.findByLabelText('Reason (optional)'),
      'I need two more days.',
    );

    await switchTab('List');
    await switchTab('Home');

    expect(
      screen.getByLabelText('Reason (optional)'),
    ).toHaveProp('value', 'I need two more days.');
  });

  it('refreshes the open assignment after returning to its tab', async () => {
    await openTabs();
    await openAssignment('Home');

    expect(await screen.findByText('Assignment A')).toBeOnTheScreen();

    await switchTab('List');
    mockAssignmentTitle = 'Updated assignment A';
    await switchTab('Home');

    expect(
      await screen.findByText('Updated assignment A'),
    ).toBeOnTheScreen();
    expect(mockFetchAssignment).toHaveBeenCalledTimes(2);
  });

  it('starts fresh after the navigation tree is closed and reopened', async () => {
    const first = await openTabs();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Open Home form' }),
    );
    await fireEvent.changeText(
      await screen.findByLabelText('Reason (optional)'),
      'Temporary draft',
    );

    await first.unmount();
    await openTabs();

    expect(screen.getByText('Home main page')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Reason (optional)')).toBeNull();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Open Home form' }),
    );

    expect(
      await screen.findByLabelText('Reason (optional)'),
    ).toHaveProp('value', '');
  });
});