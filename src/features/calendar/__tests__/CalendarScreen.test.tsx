import { fireEvent, render, screen } from '@testing-library/react-native';

import { CalendarScreen } from '../screens/CalendarScreen';

// Pin "today" to Friday, November 13, 2026 (the day used in the Figma frames).
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 10, 13, 9, 30) });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CalendarScreen', () => {
  it('opens on the month view for the current month', async () => {
    await render(<CalendarScreen />);

    expect(screen.getByRole('tab', { name: 'Month' })).toBeSelected();
    expect(screen.getByRole('header', { name: 'November 2026' })).toBeOnTheScreen();
  });

  it('selects a view when its option is tapped', async () => {
    await render(<CalendarScreen />);

    for (const name of ['Week', '2 Day', 'Day', 'Month']) {
      await fireEvent.press(screen.getByRole('tab', { name }));

      expect(screen.getByRole('tab', { name })).toBeSelected();
      expect(screen.getAllByRole('tab', { selected: true })).toHaveLength(1);
    }
  });

  it('moves between months with the arrows, across the year boundary', async () => {
    await render(<CalendarScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('header', { name: 'January 2027' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('header', { name: 'December 2026' })).toBeOnTheScreen();
  });

  it('moves the arrows by the period of the selected view', async () => {
    await render(<CalendarScreen />);

    await fireEvent.press(screen.getByRole('tab', { name: '2 Day' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Next 2 days' }));
    expect(screen.getByText('Sunday, November 15')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Week' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Previous week' }));
    expect(screen.getByText('Sunday, November 8')).toBeOnTheScreen();
  });

  it('keeps the selected day when switching views', async () => {
    await render(<CalendarScreen />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Day' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Next day' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Month' }));

    expect(screen.getByText('Saturday, November 14')).toBeOnTheScreen();
  });

  it('shows the add, search, and menu actions as not yet available', async () => {
    await render(<CalendarScreen />);

    for (const name of ['Add event', 'Search', 'More options']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  });
});
