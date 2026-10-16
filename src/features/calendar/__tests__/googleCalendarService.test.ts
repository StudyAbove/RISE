import {
  clearGoogleAccessToken,
  getGoogleAccessToken,
} from '../services/googleTokenService';

import {
  getGoogleUserInfo,
  hasGoogleCalendarAccess,
  updateGoogleCalendarEvent,
} from '../services/googleCalendarService';

jest.mock('../services/googleTokenService', () => ({
  getGoogleAccessToken: jest.fn(),
  clearGoogleAccessToken: jest.fn(),
}));

const mockGetGoogleAccessToken =
  getGoogleAccessToken as jest.Mock;

const mockClearGoogleAccessToken =
  clearGoogleAccessToken as jest.Mock;

const mockFetch = jest.fn();

globalThis.fetch =
  mockFetch as unknown as typeof fetch;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getGoogleUserInfo', () => {
  it('returns Google account information', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        email: 'student@example.com',
        name: 'Student Name',
        picture: 'https://example.com/photo.png',
      }),
    });

    await expect(
      getGoogleUserInfo(
        'google-access-token',
      ),
    ).resolves.toEqual({
      email: 'student@example.com',
      name: 'Student Name',
      picture: 'https://example.com/photo.png',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: {
          Authorization:
            'Bearer google-access-token',
        },
      },
    );
  });

  it('throws when Google user info cannot be loaded', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
    });

    await expect(
      getGoogleUserInfo(
        'google-access-token',
      ),
    ).rejects.toThrow(
      'Could not load Google account information.',
    );
  });
});

describe('hasGoogleCalendarAccess', () => {
  it('returns true when the calendar scope is granted', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        scope:
          'openid email https://www.googleapis.com/auth/calendar profile',
      }),
    });

    await expect(
      hasGoogleCalendarAccess(
        'google-access-token',
      ),
    ).resolves.toBe(true);
  });

  it('returns false when the calendar scope is missing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        scope:
          'openid email profile',
      }),
    });

    await expect(
      hasGoogleCalendarAccess(
        'google-access-token',
      ),
    ).resolves.toBe(false);
  });

  it('throws when Google permissions cannot be verified', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
    });

    await expect(
      hasGoogleCalendarAccess(
        'google-access-token',
      ),
    ).rejects.toThrow(
      'Could not verify Google Calendar permissions.',
    );
  });
});

describe('updateGoogleCalendarEvent', () => {
  it('updates the matching Google Calendar event', async () => {
    mockGetGoogleAccessToken.mockResolvedValue(
      'google-access-token',
    );

    const responseBody = {
      id: 'google-event-1',
      summary: 'Updated Biology Lecture',
      updated: '2026-10-16T07:50:00.000Z',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(
        responseBody,
      ),
    });

    await expect(
      updateGoogleCalendarEvent(
        'google-event-1',
        'google-calendar-1',
        {
          title:
            'Updated Biology Lecture',
          startAt:
            '2026-11-13T18:00:00.000Z',
          endAt:
            '2026-11-13T19:30:00.000Z',
          location: 'Room 305',
          description:
            'Bring the updated notes',
        },
      ),
    ).resolves.toEqual({
      updatedAt:
        '2026-10-16T07:50:00.000Z',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/calendar/v3/calendars/google-calendar-1/events/google-event-1',
      {
        method: 'PATCH',
        headers: {
          Authorization:
            'Bearer google-access-token',
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          summary:
            'Updated Biology Lecture',
          start: {
            dateTime:
              '2026-11-13T18:00:00.000Z',
          },
          end: {
            dateTime:
              '2026-11-13T19:30:00.000Z',
          },
          location: 'Room 305',
          description:
            'Bring the updated notes',
        }),
      },
    );
  });

  it('clears blank optional fields', async () => {
    mockGetGoogleAccessToken.mockResolvedValue(
      'google-access-token',
    );

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        id: 'google-event-1',
      }),
    });

    await updateGoogleCalendarEvent(
      'google-event-1',
      'google-calendar-1',
      {
        title: 'Updated Event',
        startAt:
          '2026-11-13T18:00:00.000Z',
        endAt:
          '2026-11-13T19:00:00.000Z',
        location: '   ',
        description: '',
      },
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          summary: 'Updated Event',
          start: {
            dateTime:
              '2026-11-13T18:00:00.000Z',
          },
          end: {
            dateTime:
              '2026-11-13T19:00:00.000Z',
          },
          location: '',
          description: '',
        }),
      }),
    );
  });

  it('throws when the Google event ID is missing', async () => {
    await expect(
      updateGoogleCalendarEvent(
        '',
        'google-calendar-1',
        {
          title: 'Updated Event',
          startAt:
            '2026-11-13T18:00:00.000Z',
          endAt:
            '2026-11-13T19:00:00.000Z',
        },
      ),
    ).rejects.toThrow(
      'GOOGLE_EVENT_ID_MISSING',
    );

    expect(
      mockGetGoogleAccessToken,
    ).not.toHaveBeenCalled();
  });

  it('throws when the Google calendar ID is missing', async () => {
    await expect(
      updateGoogleCalendarEvent(
        'google-event-1',
        '',
        {
          title: 'Updated Event',
          startAt:
            '2026-11-13T18:00:00.000Z',
          endAt:
            '2026-11-13T19:00:00.000Z',
        },
      ),
    ).rejects.toThrow(
      'GOOGLE_CALENDAR_ID_MISSING',
    );
  });

  it('requires reconnection when no access token is stored', async () => {
    mockGetGoogleAccessToken.mockResolvedValue(
      null,
    );

    await expect(
      updateGoogleCalendarEvent(
        'google-event-1',
        'google-calendar-1',
        {
          title: 'Updated Event',
          startAt:
            '2026-11-13T18:00:00.000Z',
          endAt:
            '2026-11-13T19:00:00.000Z',
        },
      ),
    ).rejects.toThrow(
      'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
    );

    expect(
      mockFetch,
    ).not.toHaveBeenCalled();
  });

  it('clears the token and requires reconnection after a 401 response', async () => {
    mockGetGoogleAccessToken.mockResolvedValue(
      'expired-token',
    );

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    await expect(
      updateGoogleCalendarEvent(
        'google-event-1',
        'google-calendar-1',
        {
          title: 'Updated Event',
          startAt:
            '2026-11-13T18:00:00.000Z',
          endAt:
            '2026-11-13T19:00:00.000Z',
        },
      ),
    ).rejects.toThrow(
      'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
    );

    expect(
      mockClearGoogleAccessToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('throws when the Google event no longer exists', async () => {
    mockGetGoogleAccessToken.mockResolvedValue(
      'google-access-token',
    );

    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(
      updateGoogleCalendarEvent(
        'google-event-1',
        'google-calendar-1',
        {
          title: 'Updated Event',
          startAt:
            '2026-11-13T18:00:00.000Z',
          endAt:
            '2026-11-13T19:00:00.000Z',
        },
      ),
    ).rejects.toThrow(
      'GOOGLE_EVENT_NOT_FOUND',
    );
  });

  it('throws a sync error for other Google Calendar failures', async () => {
    mockGetGoogleAccessToken.mockResolvedValue(
      'google-access-token',
    );

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(
      updateGoogleCalendarEvent(
        'google-event-1',
        'google-calendar-1',
        {
          title: 'Updated Event',
          startAt:
            '2026-11-13T18:00:00.000Z',
          endAt:
            '2026-11-13T19:00:00.000Z',
        },
      ),
    ).rejects.toThrow(
      'GOOGLE_CALENDAR_UPDATE_FAILED',
    );
  });
});