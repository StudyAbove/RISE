import { getAppleCalendarAccess } from '../services/calendarService';
import { getCalendarConnection } from '../services/calendarConnectionService';
import { checkCalendarProviders, getConnectedCalendarProviders } from '../services/connectedCalendars';

jest.mock('../services/calendarService', () => ({
  getAppleCalendarAccess: jest.fn(),
}));

jest.mock('../services/calendarConnectionService', () => ({
  getCalendarConnection: jest.fn(),
}));

const mockGetAppleAccess = getAppleCalendarAccess as jest.Mock;
const mockGetConnection = getCalendarConnection as jest.Mock;

// Both calendars are saved as connected, and Apple has Full Access.
beforeEach(() => {
  jest.clearAllMocks();
  mockGetConnection.mockResolvedValue({ connected: true });
  mockGetAppleAccess.mockResolvedValue('full');
});

describe('checkCalendarProviders', () => {
  it('reports each connected calendar', async () => {
    await expect(checkCalendarProviders()).resolves.toEqual([
      { provider: 'apple', status: 'connected' },
      { provider: 'google', status: 'connected' },
    ]);
  });

  it('counts Apple as not connected without Full Access', async () => {
    mockGetAppleAccess.mockResolvedValue('write-only');

    await expect(checkCalendarProviders()).resolves.toContainEqual({ provider: 'apple', status: 'not-connected' });
  });

  it('still checks Apple when checking Google fails', async () => {
    const error = new Error('Network request failed');
    mockGetConnection.mockImplementation(async (provider: string) => {
      if (provider === 'google') {
        throw error;
      }
      return { connected: true };
    });

    await expect(checkCalendarProviders()).resolves.toEqual([
      { provider: 'apple', status: 'connected' },
      { provider: 'google', status: 'check-failed', error },
    ]);
  });

  it('still checks Google when checking Apple fails', async () => {
    const error = new Error('Calendar permission error');
    mockGetAppleAccess.mockRejectedValue(error);

    await expect(checkCalendarProviders()).resolves.toEqual([
      { provider: 'apple', status: 'check-failed', error },
      { provider: 'google', status: 'connected' },
    ]);
  });
});

// The Calendar screen's sync uses this; it works the same as before #123.
describe('getConnectedCalendarProviders', () => {
  it('lists the connected calendars', async () => {
    mockGetConnection.mockImplementation(async (provider: string) => ({ connected: provider === 'google' }));

    await expect(getConnectedCalendarProviders()).resolves.toEqual(['google']);
  });

  it('throws when a check fails, so the screen shows a sync error', async () => {
    mockGetAppleAccess.mockRejectedValue(new Error('Calendar permission error'));

    await expect(getConnectedCalendarProviders()).rejects.toThrow('Calendar permission error');
  });
});
