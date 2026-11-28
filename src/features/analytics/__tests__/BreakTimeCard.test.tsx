import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';


import {
  getBreakSessions,
  type BreakSession,
} from '../../../repositories/breakSessionsRepository';
import {
  BreakTimeCard,
  formatBreakTime,
} from '../components/BreakTimeCard';

jest.mock('../../../repositories/breakSessionsRepository', () => ({
  getBreakSessions: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    require('react').useEffect(callback, [callback]);
  },
}));

const mockLoad = jest.mocked(getBreakSessions);

function session(
  id: string,
  breakType: string,
  durationSeconds: number,
): BreakSession {
  return {
    id,
    assignmentId: 'assignment-a',
    assignmentKind: 'homework',
    breakType,
    startedAt: '2026-11-28T09:00:00Z',
    durationSeconds,
  };
}

beforeEach(() => {
  mockLoad.mockReset();
  mockLoad.mockResolvedValue([]);
});

describe('break analytics (#69)', () => {
  it('formats seconds, minutes, and hours', () => {
    expect(formatBreakTime(0)).toBe('0 min 0 sec');
    expect(formatBreakTime(45)).toBe('0 min 45 sec');
    expect(formatBreakTime(125)).toBe('2 min 5 sec');
    expect(formatBreakTime(3665)).toBe('1 hr 1 min 5 sec');
  });

  it('shows an empty state before any breaks are recorded', async () => {
    await render(<BreakTimeCard />);

    expect(
      await screen.findByText('0 breaks recorded'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Take a break during a study session to see your activity here.',
      ),
    ).toBeOnTheScreen();
  });

  it('adds actual time and counts breaks separately by type', async () => {
    mockLoad.mockResolvedValue([
      session('1', 'hydrate', 45),
      session('2', 'hydrate', 75),
      session('3', 'walk', 600),
    ]);

    await render(<BreakTimeCard />);

    expect(
      await screen.findByText('12 min 0 sec'),
    ).toBeOnTheScreen();
    expect(screen.getByText('3 breaks recorded')).toBeOnTheScreen();
    expect(
      screen.getByText('2 breaks · 2 min 0 sec'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('1 break · 10 min 0 sec'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('0 breaks · 0 min 0 sec'),
    ).toBeOnTheScreen();
  });

  it('keeps historical break types in the breakdown', async () => {
    mockLoad.mockResolvedValue([session('1', 'reading', 90)]);

    await render(<BreakTimeCard />);

    expect(await screen.findByText('reading')).toBeOnTheScreen();
    expect(
      screen.getByText('1 break · 1 min 30 sec'),
    ).toBeOnTheScreen();
  });

  it('shows loading until records arrive', async () => {
    mockLoad.mockReturnValue(new Promise<BreakSession[]>(() => {}));

    await render(<BreakTimeCard />);

    expect(
      screen.getByText('Loading break activity…'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('0 breaks recorded')).toBeNull();
  });

  it('allows retry after loading fails', async () => {
    mockLoad
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce([session('1', 'hydrate', 60)]);

    await render(<BreakTimeCard />);

    expect(
      await screen.findByText('Could not load break activity.'),
    ).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Retry break activity' }),
    );

    expect(
      await screen.findByText('1 break recorded'),
    ).toBeOnTheScreen();
    expect(mockLoad).toHaveBeenCalledTimes(2);
  });
});