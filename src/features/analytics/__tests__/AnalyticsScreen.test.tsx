import { render, screen } from '@testing-library/react-native';

import { AnalyticsScreen } from '../screens/AnalyticsScreen';

// Run focus effects once, as if the tab were opened.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (effect: () => () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));

jest.mock('../../../components/TabScreenScrollView', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { TabScreenScrollView: ({ children }: { children: unknown }) => createElement(View, null, children) };
});

jest.mock('../../../components/TabPageHeader', () => ({ TabPageHeader: () => null }));

const mockGetTotalStudySeconds = jest.fn();
jest.mock('../../../repositories/studySessionsRepository', () => ({
  getTotalStudySeconds: (since?: Date) => mockGetTotalStudySeconds(since),
}));

beforeEach(() => {
  // Sunday, November 15, 2026; the week began Monday, November 9.
  jest.useFakeTimers({ now: new Date(2026, 10, 15, 18, 0) });
  mockGetTotalStudySeconds.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('AnalyticsScreen: time spent studying (#49, AC3)', () => {
  it("shows this week's recorded study time, from Monday", async () => {
    mockGetTotalStudySeconds.mockResolvedValue(12 * 3600 + 30 * 60);
    await render(<AnalyticsScreen />);

    expect(await screen.findByText('12h 30m')).toBeOnTheScreen();
    expect(screen.getByText('Time spent studying this week')).toBeOnTheScreen();
    expect(mockGetTotalStudySeconds).toHaveBeenCalledWith(new Date(2026, 10, 9));
  });

  it('shows 0m with nothing recorded', async () => {
    mockGetTotalStudySeconds.mockResolvedValue(0);
    await render(<AnalyticsScreen />);

    expect(await screen.findByText('0m')).toBeOnTheScreen();
  });

  it('shows a dash when the time cannot load', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    mockGetTotalStudySeconds.mockRejectedValue(new Error('offline'));
    await render(<AnalyticsScreen />);

    expect(await screen.findByLabelText('Time spent studying this week, not available')).toBeOnTheScreen();
  });
});
