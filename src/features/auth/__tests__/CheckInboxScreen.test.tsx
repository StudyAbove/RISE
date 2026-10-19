import { Alert, Linking } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import CheckInboxScreen from '../screens/CheckInboxScreen';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { email: 'student@csulb.edu' } }),
}));

describe('CheckInboxScreen', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the email the sign-in link was sent to', async () => {
    await render(<CheckInboxScreen />);

    expect(screen.getByText('Check your inbox')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('student@csulb.edu')).toBeOnTheScreen();
    expect(screen.getByLabelText('Step 2 of 6')).toBeOnTheScreen();
  });

  it('opens the Mail app from the arrow button', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    await render(<CheckInboxScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Open email app' }));

    await waitFor(() => {
      expect(openURL).toHaveBeenCalledWith('message:');
    });

    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('goes back to sign-up so the student can change the email', async () => {
    await render(<CheckInboxScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('explains what to do when no email app can open', async () => {
    jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValue(new Error('No app can open this URL'));

    await render(<CheckInboxScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Open email app' }));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Open your email',
        'Open your school email app and tap the sign-in link from RISE.',
      );
    });
  });
});
