import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { CalendarScreen } from '../screens/CalendarScreen';

const mockGetCalendarEventsInRange = jest.fn();
jest.mock('../../../repositories/calendarEventsRepository', () => ({
  getCalendarEventsInRange: (...args: unknown[]) => mockGetCalendarEventsInRange(...args),
}));

function makeEvent(title: string, start: Date, end: Date): CalendarEvent {
  return { id: title, userId: 'user-1', title, startAt: start.toISOString(), endAt: end.toISOString(), source: 'rise' };
}

// Pin "today" to Friday, November 13, 2026 (the day used in the Figma frames).
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 10, 13, 9, 30) });
  mockGetCalendarEventsInRange.mockResolvedValue([]);
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

  describe('events on the hourly views', () => {
    const lecture = makeEvent('Biology Lecture', new Date(2026, 10, 13, 9, 0), new Date(2026, 10, 13, 10, 30));
    const lateReview = makeEvent('Late-Night Review', new Date(2026, 10, 13, 23, 30), new Date(2026, 10, 14, 1, 0));

    beforeEach(() => {
      mockGetCalendarEventsInRange.mockResolvedValue([lecture, lateReview]);
    });

    it('shows the same event at the same time in Week, 2 Day, and Day (AC6)', async () => {
      await render(<CalendarScreen />);

      for (const view of ['Week', '2 Day', 'Day']) {
        await fireEvent.press(screen.getByRole('tab', { name: view }));

        expect(await screen.findByLabelText('Biology Lecture, 9:00 AM to 10:30 AM')).toBeOnTheScreen();
      }
    });

    it('draws an event that crosses midnight on both days', async () => {
      await render(<CalendarScreen />);

      await fireEvent.press(screen.getByRole('tab', { name: '2 Day' }));

      expect(await screen.findAllByLabelText('Late-Night Review, 11:30 PM to 1:00 AM')).toHaveLength(2);
    });

    it('loads events for the dates on screen when the view changes', async () => {
      await render(<CalendarScreen />);

      await fireEvent.press(screen.getByRole('tab', { name: 'Day' }));

      expect(mockGetCalendarEventsInRange).toHaveBeenLastCalledWith(
        new Date(2026, 10, 13),
        new Date(2026, 10, 14)
      );
    });
  });

  describe('events in the month view', () => {
    const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 0);

    it('shows up to two events under a date, then "+N more"', async () => {
      mockGetCalendarEventsInRange.mockResolvedValue([
        makeEvent('Lecture', at(13, 9), at(13, 10)),
        makeEvent('Lab', at(13, 11), at(13, 12)),
        makeEvent('Study Group', at(13, 13), at(13, 14)),
        makeEvent('Office Hours', at(13, 16), at(13, 17)),
        makeEvent('Quiz', at(18, 12), at(18, 13)),
      ]);

      await render(<CalendarScreen />);

      const todayCell = await screen.findByLabelText('Today, Friday, November 13, 4 events');
      expect(within(todayCell).getByText('Lecture')).toBeOnTheScreen();
      expect(within(todayCell).getByText('Lab')).toBeOnTheScreen();
      expect(within(todayCell).queryByText('Study Group')).not.toBeOnTheScreen();
      expect(within(todayCell).getByText('+2 more')).toBeOnTheScreen();

      const quizDay = screen.getByLabelText('Wednesday, November 18, 1 event');
      expect(within(quizDay).getByText('Quiz')).toBeOnTheScreen();
    });
  });

  describe('loading and errors', () => {
    it("shows a message with Retry when events can't load, and loads again on Retry", async () => {
      // The hook logs the error; keep the test output clean.
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      mockGetCalendarEventsInRange
        .mockRejectedValueOnce(new Error('permission denied for table calendar_events'))
        .mockResolvedValueOnce([makeEvent('Lecture', new Date(2026, 10, 13, 9), new Date(2026, 10, 13, 10))]);

      await render(<CalendarScreen />);

      expect(await screen.findByText("Couldn't load events.")).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

      expect(await screen.findByText('Lecture')).toBeOnTheScreen();
      expect(screen.queryByText("Couldn't load events.")).not.toBeOnTheScreen();
      logSpy.mockRestore();
    });

    it('shows a spinner only when loading takes a while', async () => {
      // Never finishes loading.
      mockGetCalendarEventsInRange.mockReturnValue(new Promise(() => {}));

      await render(<CalendarScreen />);
      expect(screen.queryByLabelText('Loading events')).not.toBeOnTheScreen();

      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      expect(screen.getByLabelText('Loading events')).toBeOnTheScreen();
    });

    it('shows nothing extra when there are no events', async () => {
      await render(<CalendarScreen />);

      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      expect(screen.queryByLabelText('Loading events')).not.toBeOnTheScreen();
      expect(screen.queryByText("Couldn't load events.")).not.toBeOnTheScreen();
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
