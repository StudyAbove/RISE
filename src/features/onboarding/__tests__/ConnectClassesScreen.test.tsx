import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';

import { CANVAS_EXTENSION_URL } from '../../canvas/canvasExtension';
import { ConnectClassesScreen } from '../screens/ConnectClassesScreen';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => true),
}));

describe('ConnectClassesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('copies the extension link, then continues to the calendar step', async () => {
    await render(<ConnectClassesScreen />);

    expect(screen.getByLabelText('Step 4 of 6')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Copy the Link' }));

    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
        CANVAS_EXTENSION_URL,
      );

      expect(
        screen.getByText(
          'Link copied. Open it in Chrome on your computer to add the extension.',
        ),
      ).toBeOnTheScreen();
    });

    // Copying alone shouldn't move the student on before they read the note.
    expect(mockNavigate).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(mockNavigate).toHaveBeenCalledWith('ConnectCalendar');
  });

  it('lets the student skip connecting their classes', async () => {
    await render(<ConnectClassesScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));

    expect(mockNavigate).toHaveBeenCalledWith('ConnectCalendar');
    expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
  });
});
