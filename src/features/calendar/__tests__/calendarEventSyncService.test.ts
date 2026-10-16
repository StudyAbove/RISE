import {
  getCalendarEventLinks,
  markCalendarEventLinkSynced,
} from '../../../repositories/calendarEventLinksRepository';

import {
  updateCalendarEvent,
} from '../../../repositories/calendarEventsRepository';

import {
  updateAppleCalendarEvent,
} from '../services/calendarService';

import {
  updateGoogleCalendarEvent,
} from '../services/googleCalendarService';

import {
  retryCalendarEventSync,
  updateCalendarEventWithSync,
} from '../services/calendarEventSyncService';

jest.mock('../../../repositories/calendarEventLinksRepository', () => ({
  getCalendarEventLinks: jest.fn(),
  markCalendarEventLinkSynced: jest.fn(),
}));

jest.mock('../../../repositories/calendarEventsRepository', () => ({
  updateCalendarEvent: jest.fn(),
}));

jest.mock('../services/calendarService', () => ({
  updateAppleCalendarEvent: jest.fn(),
}));

jest.mock('../services/googleCalendarService', () => ({
  updateGoogleCalendarEvent: jest.fn(),
}));

const mockGetCalendarEventLinks =
  getCalendarEventLinks as jest.Mock;

const mockMarkCalendarEventLinkSynced =
  markCalendarEventLinkSynced as jest.Mock;

const mockUpdateCalendarEvent =
  updateCalendarEvent as jest.Mock;

const mockUpdateAppleCalendarEvent =
  updateAppleCalendarEvent as jest.Mock;

const mockUpdateGoogleCalendarEvent =
  updateGoogleCalendarEvent as jest.Mock;

const updatedEvent = {
  id: 'event-1',
  userId: 'user-1',
  title: 'Updated Biology Lecture',
  startAt: '2026-11-13T18:00:00.000Z',
  endAt: '2026-11-13T19:30:00.000Z',
  source: 'rise' as const,
  location: 'Room 305',
  description: 'Bring the updated notes',
};

const updates = {
  title: 'Updated Biology Lecture',
  startAt: '2026-11-13T18:00:00.000Z',
  endAt: '2026-11-13T19:30:00.000Z',
  location: 'Room 305',
  description: 'Bring the updated notes',
};

beforeEach(() => {
  jest.clearAllMocks();

  mockUpdateCalendarEvent.mockResolvedValue(
    updatedEvent,
  );

  mockMarkCalendarEventLinkSynced.mockResolvedValue(
    undefined,
  );

  mockUpdateAppleCalendarEvent.mockResolvedValue({
    updatedAt:
      '2026-10-16T08:10:00.000Z',
  });

  mockUpdateGoogleCalendarEvent.mockResolvedValue({
    updatedAt:
      '2026-10-16T07:50:00.000Z',
  });
});

describe('updateCalendarEventWithSync', () => {
  it('saves the RISE event before syncing external calendars', async () => {
    mockGetCalendarEventLinks.mockResolvedValue([]);

    await updateCalendarEventWithSync(
      'event-1',
      updates,
    );

    expect(
      mockUpdateCalendarEvent,
    ).toHaveBeenCalledWith(
      'event-1',
      updates,
    );

    expect(
      mockGetCalendarEventLinks,
    ).toHaveBeenCalledWith(
      'event-1',
    );
  });

  it('returns saved-only when the event has no external calendar links', async () => {
    mockGetCalendarEventLinks.mockResolvedValue([]);

    await expect(
      updateCalendarEventWithSync(
        'event-1',
        updates,
      ),
    ).resolves.toEqual({
      event: updatedEvent,
      status: 'saved-only',
      providerResults: [],
    });

    expect(
      mockUpdateAppleCalendarEvent,
    ).not.toHaveBeenCalled();

    expect(
      mockUpdateGoogleCalendarEvent,
    ).not.toHaveBeenCalled();
  });

  it('syncs an Apple-linked event', async () => {
    mockGetCalendarEventLinks.mockResolvedValue([
      {
        id: 'link-1',
        calendarEventId: 'event-1',
        userId: 'user-1',
        provider: 'apple',
        externalEventId: 'apple-event-1',
      },
    ]);

    await expect(
      updateCalendarEventWithSync(
        'event-1',
        updates,
      ),
    ).resolves.toEqual({
      event: updatedEvent,
      status: 'synced',
      providerResults: [
        {
          provider: 'apple',
          status: 'synced',
        },
      ],
    });

    expect(
      mockUpdateAppleCalendarEvent,
    ).toHaveBeenCalledWith(
      'apple-event-1',
      {
        title: updatedEvent.title,
        startAt: updatedEvent.startAt,
        endAt: updatedEvent.endAt,
        location: updatedEvent.location,
        description: updatedEvent.description,
      },
    );

    expect(
      mockMarkCalendarEventLinkSynced,
    ).toHaveBeenCalledWith(
      'event-1',
      'apple',
      '2026-10-16T08:10:00.000Z',
    );
  });

  it('syncs a Google-linked event', async () => {
    mockGetCalendarEventLinks.mockResolvedValue([
      {
        id: 'link-1',
        calendarEventId: 'event-1',
        userId: 'user-1',
        provider: 'google',
        externalEventId: 'google-event-1',
        externalCalendarId: 'google-calendar-1',
      },
    ]);

    await expect(
      updateCalendarEventWithSync(
        'event-1',
        updates,
      ),
    ).resolves.toEqual({
      event: updatedEvent,
      status: 'synced',
      providerResults: [
        {
          provider: 'google',
          status: 'synced',
        },
      ],
    });

    expect(
      mockUpdateGoogleCalendarEvent,
    ).toHaveBeenCalledWith(
      'google-event-1',
      'google-calendar-1',
      {
        title: updatedEvent.title,
        startAt: updatedEvent.startAt,
        endAt: updatedEvent.endAt,
        location: updatedEvent.location,
        description: updatedEvent.description,
      },
    );

    expect(
      mockMarkCalendarEventLinkSynced,
    ).toHaveBeenCalledWith(
      'event-1',
      'google',
      '2026-10-16T07:50:00.000Z',
    );
  });

  it('syncs both Apple and Google when both are linked', async () => {
    mockGetCalendarEventLinks.mockResolvedValue([
      {
        id: 'link-apple',
        calendarEventId: 'event-1',
        userId: 'user-1',
        provider: 'apple',
        externalEventId: 'apple-event-1',
      },
      {
        id: 'link-google',
        calendarEventId: 'event-1',
        userId: 'user-1',
        provider: 'google',
        externalEventId: 'google-event-1',
        externalCalendarId: 'google-calendar-1',
      },
    ]);

    const result =
      await updateCalendarEventWithSync(
        'event-1',
        updates,
      );

    expect(result.status).toBe('synced');

    expect(result.providerResults).toEqual([
      {
        provider: 'apple',
        status: 'synced',
      },
      {
        provider: 'google',
        status: 'synced',
      },
    ]);

    expect(
      mockUpdateAppleCalendarEvent,
    ).toHaveBeenCalledTimes(1);

    expect(
      mockUpdateGoogleCalendarEvent,
    ).toHaveBeenCalledTimes(1);
  });

  it('returns partial when one provider succeeds and another fails', async () => {
    mockGetCalendarEventLinks.mockResolvedValue([
      {
        id: 'link-apple',
        calendarEventId: 'event-1',
        userId: 'user-1',
        provider: 'apple',
        externalEventId: 'apple-event-1',
      },
      {
        id: 'link-google',
        calendarEventId: 'event-1',
        userId: 'user-1',
        provider: 'google',
        externalEventId: 'google-event-1',
        externalCalendarId: 'google-calendar-1',
      },
    ]);

    mockUpdateGoogleCalendarEvent.mockRejectedValue(
      new Error(
        'GOOGLE_CALENDAR_UPDATE_FAILED',
      ),
    );

    const result =
      await updateCalendarEventWithSync(
        'event-1',
        updates,
      );

    expect(result.status).toBe('partial');

    expect(result.providerResults).toEqual([
      {
        provider: 'apple',
        status: 'synced',
      },
      {
        provider: 'google',
        status: 'failed',
        error:
          'GOOGLE_CALENDAR_UPDATE_FAILED',
      },
    ]);

    expect(
      mockMarkCalendarEventLinkSynced,
    ).toHaveBeenCalledWith(
      'event-1',
      'apple',
      '2026-10-16T08:10:00.000Z',
    );

    expect(
      mockMarkCalendarEventLinkSynced,
    ).not.toHaveBeenCalledWith(
      'event-1',
      'google',
      expect.anything(),
    );
  });

  it('returns failed when all linked providers fail', async () => {
    mockGetCalendarEventLinks.mockResolvedValue([
      {
        id: 'link-apple',
        calendarEventId: 'event-1',
        userId: 'user-1',
        provider: 'apple',
        externalEventId: 'apple-event-1',
      },
      {
        id: 'link-google',
        calendarEventId: 'event-1',
        userId: 'user-1',
        provider: 'google',
        externalEventId: 'google-event-1',
        externalCalendarId: 'google-calendar-1',
      },
    ]);

    mockUpdateAppleCalendarEvent.mockRejectedValue(
      new Error(
        'APPLE_CALENDAR_NOT_CONNECTED',
      ),
    );

    mockUpdateGoogleCalendarEvent.mockRejectedValue(
      new Error(
        'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
      ),
    );

    const result =
      await updateCalendarEventWithSync(
        'event-1',
        updates,
      );

    expect(result.status).toBe('failed');

    expect(result.providerResults).toEqual([
      {
        provider: 'apple',
        status: 'failed',
        error:
          'APPLE_CALENDAR_NOT_CONNECTED',
      },
      {
        provider: 'google',
        status: 'failed',
        error:
          'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
      },
    ]);
  });

  it('reports a missing Google calendar ID without undoing the RISE save', async () => {
    mockGetCalendarEventLinks.mockResolvedValue([
      {
        id: 'link-google',
        calendarEventId: 'event-1',
        userId: 'user-1',
        provider: 'google',
        externalEventId: 'google-event-1',
      },
    ]);

    const result =
      await updateCalendarEventWithSync(
        'event-1',
        updates,
      );

    expect(
      mockUpdateCalendarEvent,
    ).toHaveBeenCalledTimes(1);

    expect(result.status).toBe('failed');

    expect(result.providerResults).toEqual([
      {
        provider: 'google',
        status: 'failed',
        error:
          'GOOGLE_CALENDAR_ID_MISSING',
      },
    ]);
  });

  it('throws if the RISE event itself cannot be saved', async () => {
    const saveError =
      new Error('RISE_SAVE_FAILED');

    mockUpdateCalendarEvent.mockRejectedValue(
      saveError,
    );

    await expect(
      updateCalendarEventWithSync(
        'event-1',
        updates,
      ),
    ).rejects.toBe(saveError);

    expect(
      mockGetCalendarEventLinks,
    ).not.toHaveBeenCalled();

    expect(
      mockUpdateAppleCalendarEvent,
    ).not.toHaveBeenCalled();

    expect(
      mockUpdateGoogleCalendarEvent,
    ).not.toHaveBeenCalled();
  });
});

describe('retryCalendarEventSync', () => {
  it('retries Apple sync without saving the RISE event again', async () => {
    mockGetCalendarEventLinks.mockResolvedValue([
      {
        id: 'link-apple',
        calendarEventId: 'event-1',
        userId: 'user-1',
        provider: 'apple',
        externalEventId: 'apple-event-1',
      },
    ]);

    await expect(
      retryCalendarEventSync(
        updatedEvent,
        'apple',
      ),
    ).resolves.toEqual({
      provider: 'apple',
      status: 'synced',
    });

    expect(
      mockUpdateCalendarEvent,
    ).not.toHaveBeenCalled();

    expect(
      mockUpdateAppleCalendarEvent,
    ).toHaveBeenCalledWith(
      'apple-event-1',
      {
        title: updatedEvent.title,
        startAt: updatedEvent.startAt,
        endAt: updatedEvent.endAt,
        location: updatedEvent.location,
        description: updatedEvent.description,
      },
    );
  });

  it('returns a failed result when a retry still cannot sync', async () => {
    mockGetCalendarEventLinks.mockResolvedValue([
      {
        id: 'link-google',
        calendarEventId: 'event-1',
        userId: 'user-1',
        provider: 'google',
        externalEventId: 'google-event-1',
        externalCalendarId: 'google-calendar-1',
      },
    ]);

    mockUpdateGoogleCalendarEvent.mockRejectedValue(
      new Error(
        'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
      ),
    );

    await expect(
      retryCalendarEventSync(
        updatedEvent,
        'google',
      ),
    ).resolves.toEqual({
      provider: 'google',
      status: 'failed',
      error:
        'GOOGLE_CALENDAR_RECONNECT_REQUIRED',
    });
  });

  it('returns a failed result when the requested provider link is missing', async () => {
    mockGetCalendarEventLinks.mockResolvedValue([]);

    await expect(
      retryCalendarEventSync(
        updatedEvent,
        'apple',
      ),
    ).resolves.toEqual({
      provider: 'apple',
      status: 'failed',
      error:
        'APPLE_EVENT_LINK_MISSING',
    });
  });
});