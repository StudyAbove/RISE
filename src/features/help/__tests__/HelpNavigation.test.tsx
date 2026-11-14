import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { RootStackParamList } from '../../navigation/types';
import { HELP_OPTION_SCREENS, HelpPopup, type HelpOption } from '../components/HelpPopup';
import { BreathingScreen } from '../screens/BreathingScreen';
import { ExtensionEmailScreen } from '../screens/ExtensionEmailScreen';
import { OfficeHoursScreen } from '../screens/OfficeHoursScreen';

// The extension page loads the student's classes when it opens.
jest.mock('../../../repositories/canvasRepository', () => ({
  fetchCanvasCourses: async () => [],
}));

const Stack = createNativeStackNavigator<RootStackParamList>();

// Stands in for Home: a Help button that opens the popup, wired the same way.
function HelpStartScreen() {
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);

  const openHelpOption = (option: HelpOption) => {
    setVisible(false);
    navigation.navigate(HELP_OPTION_SCREENS[option]);
  };

  return (
    <View>
      <Text>Start screen</Text>
      <Pressable accessibilityRole="button" onPress={() => setVisible(true)}>
        <Text>Help</Text>
      </Pressable>
      <HelpPopup visible={visible} onSelect={openHelpOption} onClose={() => setVisible(false)} />
    </View>
  );
}

async function renderApp() {
  await render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
        {/* Any screen name works for the start; Home lives inside the tabs. */}
        <Stack.Screen name="Settings" component={HelpStartScreen} />
        <Stack.Screen name="Breathing" component={BreathingScreen} />
        <Stack.Screen name="ExtensionEmail" component={ExtensionEmailScreen} />
        <Stack.Screen name="OfficeHours" component={OfficeHoursScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('Help menu navigation (#70)', () => {
  it.each([
    ['Take a breath', 'A short breathing reset to settle your head before you start.'],
    ['Ask for an extension', 'Pick your class and fill in the blanks. We’ll write the rest.'],
    ['Book office hours', 'Pick your class, then choose a time that works.'],
  ])('opens "%s" from the help menu, and Back returns', async (option, subtitle) => {
    await renderApp();

    await fireEvent.press(screen.getByRole('button', { name: 'Help' }));
    await fireEvent.press(screen.getByRole('button', { name: option }));

    expect(await screen.findByRole('header', { name: option })).toBeOnTheScreen();
    expect(screen.getByText(subtitle)).toBeOnTheScreen();
    // The popup closed on the way.
    expect(screen.queryByText('Feeling stuck?')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByText('Start screen')).toBeOnTheScreen();
  });
});
