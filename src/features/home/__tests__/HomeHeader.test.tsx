import { render, screen } from '@testing-library/react-native';

import { HomeHeader } from '../components/HomeHeader';

// The header contains the settings gear, which needs navigation.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const MORNING = new Date(2026, 10, 13, 9, 0);

describe('HomeHeader', () => {
  it("greets the student by first name with today's date", async () => {
    await render(<HomeHeader date={MORNING} firstName="Fahd" />);

    expect(screen.getByRole('header', { name: 'Good morning, Fahd' })).toBeOnTheScreen();
    expect(screen.getByText('Friday, November 13, 2026')).toBeOnTheScreen();
  });

  it('leaves the name out when it is not available', async () => {
    await render(<HomeHeader date={MORNING} firstName={null} />);

    expect(screen.getByRole('header', { name: 'Good morning' })).toBeOnTheScreen();
  });
});
