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
    expect(screen.getByLabelText('Sunday, November 15')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Week' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Previous week' }));
    expect(screen.getByLabelText('Sunday, November 8')).toBeOnTheScreen();
  });

  it('keeps the selected day when switching views', async () => {
    await render(<CalendarScreen />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Day' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Next day' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Week' }));

    expect(screen.getByLabelText('Saturday, November 14')).toBeOnTheScreen();
  });

  describe('week view', () => {
    it('shows the Sunday–Saturday week around the selected day, with today circled', async () => {
      await render(<CalendarScreen />);

      await fireEvent.press(screen.getByRole('tab', { name: 'Week' }));

      for (const name of [
        'Sunday, November 8',
        'Monday, November 9',
        'Tuesday, November 10',
        'Wednesday, November 11',
        'Thursday, November 12',
        'Today, Friday, November 13',
        'Saturday, November 14',
      ]) {
        expect(screen.getByRole('header', { name })).toBeOnTheScreen();
      }
      // Seven day headers plus the "November 2026" label.
      expect(screen.getAllByRole('header')).toHaveLength(8);
    });

    it('shows every hour of the day', async () => {
      await render(<CalendarScreen />);

      await fireEvent.press(screen.getByRole('tab', { name: 'Week' }));

      for (const hour of ['12 AM', '7 AM', '12 PM', '11 PM']) {
        expect(screen.getByText(hour)).toBeOnTheScreen();
      }
    });

    it('moves to the next week across a month boundary', async () => {
      await render(<CalendarScreen />);

      await fireEvent.press(screen.getByRole('tab', { name: 'Week' }));
      for (let week = 0; week < 3; week += 1) {
        await fireEvent.press(screen.getByRole('button', { name: 'Next week' }));
      }

      // Three weeks after November 13 is the week of November 29 – December 5.
      expect(screen.getByLabelText('Sunday, November 29')).toBeOnTheScreen();
      expect(screen.getByLabelText('Saturday, December 5')).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: 'December 2026' })).toBeOnTheScreen();
    });
  });

  describe('2 day view', () => {
    it('shows the selected day and the next day', async () => {
      await render(<CalendarScreen />);

      await fireEvent.press(screen.getByRole('tab', { name: '2 Day' }));

      expect(screen.getByRole('header', { name: 'Today, Friday, November 13' })).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: 'Saturday, November 14' })).toBeOnTheScreen();
      // Two day headers plus the "November 2026" label.
      expect(screen.getAllByRole('header')).toHaveLength(3);
      expect(screen.getByText('7 AM')).toBeOnTheScreen();
    });

    it('moves two days at a time, into the next month', async () => {
      await render(<CalendarScreen />);

      await fireEvent.press(screen.getByRole('tab', { name: '2 Day' }));
      for (let page = 0; page < 9; page += 1) {
        await fireEvent.press(screen.getByRole('button', { name: 'Next 2 days' }));
      }

      // 18 days after November 13.
      expect(screen.getByRole('header', { name: 'Tuesday, December 1' })).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: 'Wednesday, December 2' })).toBeOnTheScreen();
    });
  });

  describe('day view', () => {
    it('shows only the selected day, with its date', async () => {
      await render(<CalendarScreen />);

      await fireEvent.press(screen.getByRole('tab', { name: 'Day' }));

      expect(screen.getByRole('header', { name: 'Today, Friday, November 13' })).toBeOnTheScreen();
      expect(screen.getAllByRole('header')).toHaveLength(2);
      expect(screen.getByText('11 PM')).toBeOnTheScreen();
    });

    it('moves one day at a time', async () => {
      await render(<CalendarScreen />);

      await fireEvent.press(screen.getByRole('tab', { name: 'Day' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Previous day' }));

      expect(screen.getByRole('header', { name: 'Thursday, November 12' })).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: /November 13/ })).not.toBeOnTheScreen();
    });
  });

  describe('month view', () => {
    it("shows every date of the current month and circles today's date", async () => {
      await render(<CalendarScreen />);

      expect(screen.getByLabelText('Sunday, November 1')).toBeOnTheScreen();
      expect(screen.getByLabelText('Monday, November 30')).toBeOnTheScreen();
      expect(screen.getByLabelText('Today, Friday, November 13')).toBeOnTheScreen();
    });

    it('leaves the cells for neighboring months blank', async () => {
      await render(<CalendarScreen />);

      // November's last row ends on Saturday, December 5.
      expect(screen.queryByLabelText('Tuesday, December 1')).not.toBeOnTheScreen();
      // Only November 5 shows a "5"; December 5 is blank.
      expect(screen.getAllByText('5')).toHaveLength(1);
    });

    it('shows the correct dates after moving to another month', async () => {
      await render(<CalendarScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));

      // December 2026 starts on a Tuesday and has 31 days.
      expect(screen.getByLabelText('Tuesday, December 1')).toBeOnTheScreen();
      expect(screen.getByLabelText('Thursday, December 31')).toBeOnTheScreen();
      expect(screen.queryByLabelText('Monday, November 30')).not.toBeOnTheScreen();
    });

    it("only circles today's date in the current month", async () => {
      await render(<CalendarScreen />);

      await fireEvent.press(screen.getByRole('button', { name: 'Previous month' }));

      expect(screen.getByLabelText('Tuesday, October 13')).toBeOnTheScreen();
      expect(screen.queryByLabelText(/^Today/)).not.toBeOnTheScreen();
    });
  });

  it('shows the add, search, and menu actions as not yet available', async () => {
    await render(<CalendarScreen />);

    for (const name of ['Add event', 'Search', 'More options']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  });
});
