import { NavigationContainer } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';

import { RootNavigator } from '../navigators/RootNavigator';

describe('RootNavigator', () => {
  it('opens the main tabs with the nav bar and Home showing', async () => {
    await render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>,
    );

    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByRole('tab', { name: 'Home' })).toBeSelected();
    expect(screen.getByRole('header', { name: 'Home' })).toBeOnTheScreen();
  });
});
