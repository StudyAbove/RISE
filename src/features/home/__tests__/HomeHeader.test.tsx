import { render, screen } from '@testing-library/react-native';

import { HomeHeader } from '../components/HomeHeader';

// The header contains the settings gear, which needs navigation.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const MORNING = new Date(2026, 10, 13, 9, 0);

describe('HomeHeader', () => {

  it.each([0, 1, 3, 12, 100])(
    'displays a streak count of %i on Home',
    async (count) => {
      await render(
        <HomeHeader
          date={MORNING}
          firstName="Fahd"
          streakCount={count}
        />,
      );

      expect(
        screen.getByText(String(count)),
      ).toBeOnTheScreen();

      expect(
        screen.getByRole('button', { name: 'Streak' }),
      ).toHaveAccessibilityValue({
        text: `${count} ${count === 1 ? 'day' : 'days'}`,
      });
    },
  );

  it('updates the displayed streak when the count changes', async () => {
    const { rerender } = await render(
      <HomeHeader
        date={MORNING}
        firstName="Fahd"
        streakCount={3}
      />,
    );

    expect(screen.getByText('3')).toBeOnTheScreen();

    await rerender(
      <HomeHeader
        date={MORNING}
        firstName="Fahd"
        streakCount={4}
      />,
    );

    expect(screen.getByText('4')).toBeOnTheScreen();
    expect(screen.queryByText('3')).toBeNull();
  });

  it('does not show a misleading zero while streak data is unavailable', async () => {
    await render(
      <HomeHeader
        date={MORNING}
        firstName="Fahd"
        streakCount={null}
      />,
    );

    expect(screen.getByText('—')).toBeOnTheScreen();
    expect(screen.queryByText('0')).toBeNull();
  });


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
