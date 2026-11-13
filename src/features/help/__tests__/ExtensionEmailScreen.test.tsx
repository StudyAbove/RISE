import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';

import { ExtensionEmailError } from '../../../repositories/extensionEmailRepository';
import { ExtensionEmailScreen } from '../screens/ExtensionEmailScreen';

const mockFetchCourses = jest.fn();
const mockFetchAssignments = jest.fn();
const mockRequestEmail = jest.fn();

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../components/BackButton', () => ({
  BackButton: () => null,
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => true),
}));

jest.mock('../../../repositories/canvasRepository', () => ({
  fetchCanvasCourses: () => mockFetchCourses(),
}));

jest.mock('../../../repositories/extensionEmailRepository', () => {
  const actual = jest.requireActual('../../../repositories/extensionEmailRepository');

  return {
    ...actual,
    fetchOpenAssignmentsForCourse: (courseId: string) => mockFetchAssignments(courseId),
    requestExtensionEmail: (request: unknown) => mockRequestEmail(request),
  };
});

const milestoneDue = new Date(2026, 10, 13, 23, 59);

const email = {
  subject: 'Extension request: Milestone 4 report (CECS 491B)',
  body: 'Dear Professor,\n\nCould I have a few more days on Milestone 4?\n\nSincerely,\nJulia',
};

beforeEach(() => {
  mockFetchCourses.mockReset();
  mockFetchAssignments.mockReset();
  mockRequestEmail.mockReset();
  jest.mocked(Clipboard.setStringAsync).mockClear();

  mockFetchCourses.mockResolvedValue([
    { id: 'c1', name: 'Senior Project', code: 'CECS 491B', color: 'sky', syncEnabled: true },
    { id: 'c2', name: 'Cell Biology', code: 'BIO 200', color: 'mint', syncEnabled: true },
    { id: 'c3', name: 'Old Class', code: 'OLD 100', color: 'sand', syncEnabled: false },
  ]);
  mockFetchAssignments.mockResolvedValue([
    { id: 'a1', title: 'Milestone 4 report', dueAt: milestoneDue },
    { id: 'a2', title: 'Peer review', dueAt: null },
  ]);
  mockRequestEmail.mockResolvedValue(email);
});

async function chooseClass(label: string) {
  await fireEvent.press(await screen.findByRole('button', { name: 'Class, Select a class' }));
  await fireEvent.press(screen.getByRole('button', { name: label }));
}

async function chooseAssignment(label: string) {
  await fireEvent.press(screen.getByRole('button', { name: 'Assignment, Select an assignment' }));
  await fireEvent.press(await screen.findByRole('button', { name: label }));
}

describe('ExtensionEmailScreen (#72)', () => {
  it('lists only synced classes, then that class’s unfinished assignments', async () => {
    await render(<ExtensionEmailScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Class, Select a class' }));

    expect(screen.getByRole('button', { name: 'CECS 491B' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'BIO 200' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'OLD 100' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'CECS 491B' }));
    expect(mockFetchAssignments).toHaveBeenCalledWith('c1');

    await fireEvent.press(screen.getByRole('button', { name: 'Assignment, Select an assignment' }));

    expect(await screen.findByRole('button', { name: 'Milestone 4 report · Fri, Nov 13' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Peer review' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Type my own' })).toBeOnTheScreen();
  });

  it('writes the email for the chosen class and assignment, with the reason', async () => {
    await render(<ExtensionEmailScreen />);

    await chooseClass('CECS 491B');
    await chooseAssignment('Milestone 4 report · Fri, Nov 13');
    await fireEvent.changeText(screen.getByLabelText('Reason (optional)'), ' I was sick this week. ');
    await fireEvent.press(screen.getByRole('button', { name: 'Generate email' }));

    expect(mockRequestEmail).toHaveBeenCalledWith({
      courseId: 'c1',
      className: 'CECS 491B',
      assignmentTitle: 'Milestone 4 report',
      dueAt: milestoneDue,
      reason: 'I was sick this week.',
    });
    expect(await screen.findByText(`Subject: ${email.subject}`)).toBeOnTheScreen();
    expect(screen.getByText(email.body)).toBeOnTheScreen();
  });

  it('lets the student type an assignment that isn’t in the list', async () => {
    await render(<ExtensionEmailScreen />);

    await chooseClass('BIO 200');
    await chooseAssignment('Type my own');
    await fireEvent.changeText(screen.getByLabelText('Assignment name'), 'Lab 5 redo');
    await fireEvent.press(screen.getByRole('button', { name: 'Generate email' }));

    expect(mockRequestEmail).toHaveBeenCalledWith({
      courseId: 'c2',
      className: 'BIO 200',
      assignmentTitle: 'Lab 5 redo',
      dueAt: null,
      reason: null,
    });
  });

  it.each([
    ['nothing is chosen', async () => {}, 'Choose a class and an assignment first.'],
    ['there is no assignment', () => chooseClass('CECS 491B'), 'Choose or type the assignment first.'],
  ])('asks for what’s missing when %s', async (_case, fillIn, message) => {
    await render(<ExtensionEmailScreen />);
    await screen.findByRole('button', { name: 'Class, Select a class' });

    await fillIn();
    await fireEvent.press(screen.getByRole('button', { name: 'Generate email' }));

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(mockRequestEmail).not.toHaveBeenCalled();
  });

  it('copies the subject and message', async () => {
    await render(<ExtensionEmailScreen />);

    await chooseClass('CECS 491B');
    await chooseAssignment('Peer review');
    await fireEvent.press(screen.getByRole('button', { name: 'Generate email' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Copy email' }));

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(`Subject: ${email.subject}\n\n${email.body}`);
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeOnTheScreen();
  });

  it('says when the email couldn’t be written', async () => {
    mockRequestEmail.mockRejectedValue(new ExtensionEmailError('generation_failed'));

    await render(<ExtensionEmailScreen />);

    await chooseClass('CECS 491B');
    await chooseAssignment('Peer review');
    await fireEvent.press(screen.getByRole('button', { name: 'Generate email' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t write the email. Please try again.');
    });
    expect(screen.getByRole('button', { name: 'Generate email' })).toBeOnTheScreen();
  });
});
