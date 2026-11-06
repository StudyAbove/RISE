import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';

import { TakeABreakScreen } from '../screens/TakeABreakScreen';

const mockReplace = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');

  return {
    ...actual,
    useNavigation: () => ({
      replace: mockReplace,
      goBack: mockGoBack,
    }),
  };
});

// Simulate the slider's completion callback.
// The real slider's gestures and animation have their own tests.
jest.mock('../components/StartSessionSlider', () => {
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

describe('starting the selected break (#23)', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockGoBack.mockReset();
  });

  it('does not start a timer just by opening break selection', async () => {
    await render(<TakeABreakScreen />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it.each([
    ['Stretch', 'stretch'],
    ['Hydrate', 'hydrate'],
    ['Walk', 'walk'],
  ])(
    'starts the selected %s break when the slider finishes',
    async (label, breakId) => {
      await render(<TakeABreakScreen />);

      await fireEvent.press(
        screen.getByRole('tab', {
          name: `${label} break`,
        }),
      );

      expect(mockReplace).not.toHaveBeenCalled();

      await fireEvent.press(
        screen.getByRole('button', {
          name: 'Finish sliding to start break',
        }),
      );

      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith(
        'BreakSession',
        { breakId },
      );
      expect(mockGoBack).not.toHaveBeenCalled();
    },
  );

  it('uses the latest selection after switching break options', async () => {
    await render(<TakeABreakScreen />);

    await fireEvent.press(
      screen.getByRole('tab', { name: 'Hydrate break' }),
    );

    await fireEvent.press(
      screen.getByRole('tab', { name: 'Walk break' }),
    );

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Finish sliding to start break',
      }),
    );

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(
      'BreakSession',
      { breakId: 'walk' },
    );
  });
});