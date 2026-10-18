import { createGoogleCalendarEvent } from '../services/googleCalendarService';
import { clearGoogleAccessToken, getGoogleAccessToken } from '../services/googleTokenService';

jest.mock('../services/googleTokenService', () => ({
  getGoogleAccessToken: jest.fn(),
  clearGoogleAccessToken: jest.fn(),
}));

const mockGetGoogleAccessToken = getGoogleAccessToken as jest.Mock;
const mockClearGoogleAccessToken = clearGoogleAccessToken as jest.Mock;

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

const lab = {
  title: 'Chem Lab',
  startAt: '2026-11-18T17:00:00.000Z',
  endAt: '2026-11-18T18:00:00.000Z',
  location: ' Room 204 ',
  reminderMinutes: 1440,
};

// Google answers the main-calendar lookup, then the create request.
function mockGoogle(created: object = { id: 'google-event-1', updated: '2026-11-13T09:31:00.000Z' }) {
  mockFetch
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'student@csulb.edu' }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => created });
}

const createRequest = () => mockFetch.mock.calls[1];
const createBody = () => JSON.parse(createRequest()[1].body);

beforeEach(() => {
  jest.clearAllMocks();
  mockGetGoogleAccessToken.mockResolvedValue('google-access-token');
});

describe('createGoogleCalendarEvent', () => {
  it("adds the event to the student's main calendar and returns its ids", async () => {
    mockGoogle();

    await expect(createGoogleCalendarEvent(lab)).resolves.toEqual({
      externalEventId: 'google-event-1',
      externalCalendarId: 'student@csulb.edu',
      updatedAt: '2026-11-13T09:31:00.000Z',
    });
    expect(mockFetch.mock.calls[0][0]).toBe('https://www.googleapis.com/calendar/v3/calendars/primary');
    // Created under the real calendar ID, which is what the import matches on.
    expect(createRequest()[0]).toBe(
      'https://www.googleapis.com/calendar/v3/calendars/student%40csulb.edu/events'
    );
    expect(createRequest()[1]).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer google-access-token' },
    });
  });

  it('sends the title, times, trimmed location, and reminder', async () => {
    mockGoogle();

    await createGoogleCalendarEvent({ ...lab, description: 'Bring goggles' });

    expect(createBody()).toEqual({
      summary: 'Chem Lab',
      start: { dateTime: '2026-11-18T17:00:00.000Z' },
      end: { dateTime: '2026-11-18T18:00:00.000Z' },
      location: 'Room 204',
      description: 'Bring goggles',
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 1440 }] },
    });
  });

  it("leaves out blank details and keeps the calendar's default reminders when none was chosen", async () => {
    mockGoogle();

    await createGoogleCalendarEvent({ ...lab, location: '  ', reminderMinutes: undefined });

    expect(createBody()).not.toHaveProperty('location');
    expect(createBody()).not.toHaveProperty('description');
    expect(createBody().reminders).toEqual({ useDefault: true });
  });

  it('asks the student to reconnect when no Google access token is saved', async () => {
    mockGetGoogleAccessToken.mockResolvedValue(null);

    await expect(createGoogleCalendarEvent(lab)).rejects.toThrow('GOOGLE_CALENDAR_RECONNECT_REQUIRED');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('clears an expired token and asks the student to reconnect', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    await expect(createGoogleCalendarEvent(lab)).rejects.toThrow('GOOGLE_CALENDAR_RECONNECT_REQUIRED');
    expect(mockClearGoogleAccessToken).toHaveBeenCalled();
  });

  it('does the same when the token expires between the two requests', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'student@csulb.edu' }) })
      .mockResolvedValueOnce({ ok: false, status: 401 });

    await expect(createGoogleCalendarEvent(lab)).rejects.toThrow('GOOGLE_CALENDAR_RECONNECT_REQUIRED');
    expect(mockClearGoogleAccessToken).toHaveBeenCalled();
  });

  it('reports other Google failures', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'student@csulb.edu' }) })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(createGoogleCalendarEvent(lab)).rejects.toThrow('GOOGLE_CALENDAR_CREATE_FAILED');
    expect(mockClearGoogleAccessToken).not.toHaveBeenCalled();
  });
});
