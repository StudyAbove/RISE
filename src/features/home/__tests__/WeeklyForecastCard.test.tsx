import { fireEvent, render, screen } from '@testing-library/react-native';

import { WeeklyForecastCard } from '../components/WeeklyForecastCard';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
import type { WeeklyForecast } from '../utils/weeklyForecast';

// Monday, November 9, 2026 at 9 AM, local time.
const now = new Date(2026, 10, 9, 9, 0);

const heavyWeek: WeeklyForecast = {
  level: 'heavy',
  title: 'Heavy week ahead',
  summary: 'You have 4 assignments due and 2 exams coming up. Friday is your busiest day.',
  totalMinutes: 720,
  recommended: [
    {
      id: 'a1',
      assignmentId: 'a1',
      courseId: 'ee381',
      title: 'Problem Set #5',
      courseLabel: 'EE 381',
      courseColor: '#8FA8F0',
      dueAt: new Date(2026, 10, 13, 23, 59),
      minutes: 45,
      kind: 'homework',
    },
    {
      id: 'a2',
      assignmentId: 'a2',
      courseId: 'bio200',
      title: 'Osmosis Lab Report',
      courseLabel: 'BIO 200',
      courseColor: '#A8BEA3',
      dueAt: new Date(2026, 10, 13, 17, 0),
      minutes: 80,
      kind: 'lab',
    },
  ],
};

describe('WeeklyForecastCard', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('opens the class’s week when its class is tapped', async () => {
    await render(<WeeklyForecastCard status="ready" forecast={heavyWeek} now={now} onHelpPress={jest.fn()} />);

    await fireEvent.press(screen.getByRole('button', { name: 'EE 381 this week' }));

    expect(mockNavigate).toHaveBeenCalledWith('ClassWeek', {
      courseId: 'ee381',
      courseLabel: 'EE 381',
    });
  });

  it('opens the assignment when its row is tapped', async () => {
    await render(<WeeklyForecastCard status="ready" forecast={heavyWeek} now={now} onHelpPress={jest.fn()} />);

    await fireEvent.press(
      screen.getByRole('button', { name: /BIO 200 - Osmosis Lab Report/ }),
    );

    expect(mockNavigate).toHaveBeenCalledWith('AssignmentDetails', { assignmentId: 'a2' });
  });

  it('shows the week, its summary, and what to start first with due times and estimates', async () => {
    await render(<WeeklyForecastCard status="ready" forecast={heavyWeek} now={now} onHelpPress={jest.fn()} />);

    expect(screen.getByText('Heavy week ahead')).toBeOnTheScreen();
    expect(screen.getByText(heavyWeek.summary)).toBeOnTheScreen();
    expect(screen.getByText('Recommended to get ahead')).toBeOnTheScreen();
    expect(screen.getByText('EE 381')).toBeOnTheScreen();
    expect(screen.getByText('- Problem Set #5')).toBeOnTheScreen();
    expect(screen.getByText('Fri 11:59 PM • 45m')).toBeOnTheScreen();
    expect(screen.getByText('Fri 5:00 PM • 1h 20m')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('EE 381 - Problem Set #5, due Fri 11:59 PM, about 45m'),
    ).toBeOnTheScreen();
  });

  it('says the week looks clear without a list', async () => {
    await render(
      <WeeklyForecastCard
        status="ready"
        forecast={{
          level: 'clear',
          title: 'Your week looks clear',
          summary: 'Nothing is due in the next 7 days. Enjoy the breathing room!',
          totalMinutes: 0,
          recommended: [],
        }}
        now={now} onHelpPress={jest.fn()}
      />,
    );

    expect(screen.getByText('Your week looks clear')).toBeOnTheScreen();
    expect(screen.queryByText('Recommended to get ahead')).not.toBeOnTheScreen();
  });

  it('shows loading and error states', async () => {
    const { rerender } = await render(
      <WeeklyForecastCard status="loading" forecast={null} now={now} onHelpPress={jest.fn()} />,
    );

    expect(screen.getByText('Looking at your week…')).toBeOnTheScreen();

    await rerender(<WeeklyForecastCard status="error" forecast={null} now={now} onHelpPress={jest.fn()} />);

    expect(
      screen.getByText('RISE couldn’t load your week. Check your connection and try again.'),
    ).toBeOnTheScreen();
  });

  it('opens the help menu from Help', async () => {
    const onHelpPress = jest.fn();

    await render(
      <WeeklyForecastCard status="ready" forecast={heavyWeek} now={now} onHelpPress={onHelpPress} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Help' }));

    expect(onHelpPress).toHaveBeenCalledTimes(1);
  });
});
