import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { RootNavigator } from '../../navigation/navigators/RootNavigator';

async function renderApp() {
  await render(
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>,
  );
}

describe('SettingsButton', () => {
  it('opens the Settings page, and Back returns to the previous page', async () => {
    await renderApp();

    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('header', { name: 'Settings' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByRole('header', { name: 'Settings' })).not.toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Home' })).toBeOnTheScreen();
  });

  it.each(['Study', 'List', 'Analytics'])('is shown on the %s page', async (tab) => {
    await renderApp();

    await fireEvent.press(screen.getByRole('tab', { name: tab }));

    expect(screen.getByRole('button', { name: 'Settings' })).toBeOnTheScreen();
  });

  it('is not shown on the Calendar page', async () => {
    await renderApp();

    await fireEvent.press(screen.getByRole('tab', { name: 'Calendar' }));

    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeOnTheScreen();
  });
});
