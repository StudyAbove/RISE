import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { MAIN_TABS } from '../config/mainTabs';
import { MainTabNavigator } from '../navigators/MainTabNavigator';

async function renderMainTabs() {
  await render(
    <NavigationContainer>
      <MainTabNavigator />
    </NavigationContainer>,
  );
}

describe('BottomNavBar', () => {
  it('shows a tab with a label for every main page', async () => {
    await renderMainTabs();

    for (const tab of MAIN_TABS) {
      const tabButton = screen.getByRole('tab', { name: tab.label });
      expect(within(tabButton).getByText(tab.label)).toBeOnTheScreen();
    }
  });

  it('opens Home by default', async () => {
    await renderMainTabs();

    expect(screen.getByRole('header', { name: 'Home' })).toBeOnTheScreen();
  });

  it('opens the page for the tab that was tapped', async () => {
    await renderMainTabs();

    await fireEvent.press(screen.getByRole('tab', { name: 'Calendar' }));

    expect(screen.getByRole('header', { name: 'Calendar' })).toBeOnTheScreen();
  });
});
