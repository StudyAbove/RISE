import { NavigationContainer } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';

import { useAuthStatus } from '../../auth/hooks/useAuthStatus';
import { RootNavigator } from '../navigators/RootNavigator';

jest.mock('../../auth/hooks/useAuthStatus');
const mockUseAuthStatus = jest.mocked(useAuthStatus);

async function renderRootNavigator() {
  await render(
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>,
  );
}

describe('RootNavigator', () => {
  it('shows the nav bar with Home open after sign in and onboarding', async () => {
    mockUseAuthStatus.mockReturnValue({ isSignedIn: true, hasCompletedOnboarding: true });

    await renderRootNavigator();

    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByRole('header', { name: 'Home' })).toBeOnTheScreen();
  });

  it('hides the nav bar when the user is signed out', async () => {
    mockUseAuthStatus.mockReturnValue({ isSignedIn: false, hasCompletedOnboarding: false });

    await renderRootNavigator();

    expect(screen.getByRole('header', { name: 'Sign In' })).toBeOnTheScreen();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('hides the nav bar while the user is in onboarding', async () => {
    mockUseAuthStatus.mockReturnValue({ isSignedIn: true, hasCompletedOnboarding: false });

    await renderRootNavigator();

    expect(screen.getByRole('header', { name: 'Onboarding' })).toBeOnTheScreen();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });
});
