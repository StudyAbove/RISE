import type { CalendarEvent } from '../../../models/CalendarEvent';
import { createCalendarEventWithSync } from '../services/calendarEventSyncService';

const mockCreateCalendarEvent = jest.fn();
const mockSaveCalendarEventLink = jest.fn();
const mockCheckCalendarProviders = jest.fn();
const mockCreateGoogleCalendarEvent = jest.fn();
const mockCreateAppleCalendarEvent = jest.fn();
const mockDeleteGoogleCalendarEvent = jest.fn();
const mockDeleteAppleCalendarEvent = jest.fn();
const mockDevFlags = { skipAuth: false };

jest.mock('../../../lib/devFlags', () => ({
  get DEV_SKIP_AUTH() {
    return mockDevFlags.skipAuth;
  },
}));
jest.mock('../../../repositories/calendarEventsRepository', () => ({
  createCalendarEvent: (...args: unknown[]) => mockCreateCalendarEvent(...args),
}));
jest.mock('../../../repositories/calendarEventLinksRepository', () => ({
  saveCalendarEventLink: (...args: unknown[]) => mockSaveCalendarEventLink(...args),
}));
jest.mock('../services/connectedCalendars', () => ({
  checkCalendarProviders: () => mockCheckCalendarProviders(),
}));

// Apple and Google are both checked; the ones listed are connected.
function mockConnectedCalendars(connected: ('apple' | 'google')[]) {
  mockCheckCalendarProviders.mockResolvedValue(
    (['apple', 'google'] as const).map((provider) => ({
      provider,
      status: connected.includes(provider) ? 'connected' : 'not-connected',
    })),
  );
}
jest.mock('../services/googleCalendarService', () => ({
  createGoogleCalendarEvent: (...args: unknown[]) => mockCreateGoogleCalendarEvent(...args),
  deleteGoogleCalendarEvent: (...args: unknown[]) => mockDeleteGoogleCalendarEvent(...args),
}));
jest.mock('../services/calendarService', () => ({
  createAppleCalendarEvent: (...args: unknown[]) => mockCreateAppleCalendarEvent(...args),
  deleteAppleCalendarEvent: (...args: unknown[]) => mockDeleteAppleCalendarEvent(...args),
}));

const input = {
  title: 'Chem Lab',
  startAt: '2026-11-18T17:00:00.000Z',
  endAt: '2026-11-18T18:00:00.000Z',
  location: 'Room 204',
  reminderMinutes: 1440,
};

const savedEvent: CalendarEvent = { ...input, id: 'rise-event-1', userId: 'user-1', source: 'rise' };

const sentDetails = {
  title: 'Chem Lab',
  startAt: '2026-11-18T17:00:00.000Z',
  endAt: '2026-11-18T18:00:00.000Z',
  location: 'Room 204',
  description: undefined,
  reminderMinutes: 1440,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDevFlags.skipAuth = false;
  jest.spyOn(console, 'log').mockImplementation(() => {});
  mockCreateCalendarEvent.mockResolvedValue(savedEvent);
  mockSaveCalendarEventLink.mockResolvedValue(undefined);
  mockDeleteGoogleCalendarEvent.mockResolvedValue(undefined);
  mockDeleteAppleCalendarEvent.mockResolvedValue(undefined);
  mockCreateGoogleCalendarEvent.mockResolvedValue({
    externalEventId: 'google-event-1',
    externalCalendarId: 'student@csulb.edu',
    updatedAt: '2026-11-13T09:31:00.000Z',
  });
  mockCreateAppleCalendarEvent.mockResolvedValue({
    externalEventId: 'apple-event-1',
    externalCalendarId: 'apple-default',
    updatedAt: '2026-11-13T09:31:05.000Z',
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('createCalendarEventWithSync', () => {
  it('just saves in RISE when no calendar is connected', async () => {
    mockConnectedCalendars([]);

    await expect(createCalendarEventWithSync(input)).resolves.toEqual({
      event: savedEvent,
      status: 'saved-only',
      providerResults: [],
    });
    expect(mockCreateGoogleCalendarEvent).not.toHaveBeenCalled();
    expect(mockCreateAppleCalendarEvent).not.toHaveBeenCalled();
  });

  it('adds the event to every connected calendar and links each copy', async () => {
    mockConnectedCalendars(['apple', 'google']);

    const result = await createCalendarEventWithSync(input);

    expect(result.status).toBe('synced');
    expect(result.providerResults).toEqual([
      { provider: 'apple', status: 'synced' },
      { provider: 'google', status: 'synced' },
    ]);
    expect(mockCreateAppleCalendarEvent).toHaveBeenCalledWith(sentDetails);
    expect(mockCreateGoogleCalendarEvent).toHaveBeenCalledWith(sentDetails);
    expect(mockSaveCalendarEventLink).toHaveBeenCalledWith({
      calendarEventId: 'rise-event-1',
      userId: 'user-1',
      provider: 'google',
      externalEventId: 'google-event-1',
      externalCalendarId: 'student@csulb.edu',
      externalUpdatedAt: '2026-11-13T09:31:00.000Z',
    });
    expect(mockSaveCalendarEventLink).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'apple', externalEventId: 'apple-event-1' })
    );
  });

  it('keeps going when one calendar fails, and reports why', async () => {
    mockConnectedCalendars(['apple', 'google']);
    mockCreateGoogleCalendarEvent.mockRejectedValue(new Error('GOOGLE_CALENDAR_RECONNECT_REQUIRED'));

    const result = await createCalendarEventWithSync(input);

    expect(result.status).toBe('partial');
    expect(result.providerResults).toEqual([
      { provider: 'apple', status: 'synced' },
      { provider: 'google', status: 'failed', error: 'GOOGLE_CALENDAR_RECONNECT_REQUIRED' },
    ]);
    // Only the copy that exists gets a link.
    expect(mockSaveCalendarEventLink).toHaveBeenCalledTimes(1);
  });

  it('still keeps the RISE event when every calendar fails', async () => {
    mockConnectedCalendars(['google']);
    mockCreateGoogleCalendarEvent.mockRejectedValue(new Error('GOOGLE_CALENDAR_CREATE_FAILED'));

    const result = await createCalendarEventWithSync(input);

    expect(result.status).toBe('failed');
    expect(result.event).toEqual(savedEvent);
  });

  // Without a link, the next import would bring the copy back as a duplicate.
  it('deletes a copy whose link could not be saved, and counts it as failed', async () => {
    mockConnectedCalendars(['apple', 'google']);
    mockSaveCalendarEventLink.mockRejectedValue(new Error('permission denied for table calendar_event_links'));

    const result = await createCalendarEventWithSync(input);

    expect(result.status).toBe('failed');
    expect(result.providerResults).toEqual([
      { provider: 'apple', status: 'failed', error: 'permission denied for table calendar_event_links' },
      { provider: 'google', status: 'failed', error: 'permission denied for table calendar_event_links' },
    ]);
    expect(mockDeleteGoogleCalendarEvent).toHaveBeenCalledWith('google-event-1', 'student@csulb.edu');
    expect(mockDeleteAppleCalendarEvent).toHaveBeenCalledWith('apple-event-1', input.startAt);
  });

  it('only removes the copy whose link failed', async () => {
    mockConnectedCalendars(['apple', 'google']);
    mockSaveCalendarEventLink.mockImplementation(async ({ provider }: { provider: string }) => {
      if (provider === 'google') {
        throw new Error('Network request failed');
      }
    });

    const result = await createCalendarEventWithSync(input);

    expect(result.status).toBe('partial');
    expect(mockDeleteGoogleCalendarEvent).toHaveBeenCalledTimes(1);
    expect(mockDeleteAppleCalendarEvent).not.toHaveBeenCalled();
  });

  it('still reports the failure when the unlinked copy cannot be removed either', async () => {
    mockConnectedCalendars(['google']);
    mockSaveCalendarEventLink.mockRejectedValue(new Error('Network request failed'));
    mockDeleteGoogleCalendarEvent.mockRejectedValue(new Error('GOOGLE_CALENDAR_DELETE_FAILED'));

    const result = await createCalendarEventWithSync(input);

    expect(result.status).toBe('failed');
    expect(result.providerResults).toEqual([
      { provider: 'google', status: 'failed', error: 'Network request failed' },
    ]);
  });

  it("doesn't delete anything when creating the copy itself failed", async () => {
    mockConnectedCalendars(['google']);
    mockCreateGoogleCalendarEvent.mockRejectedValue(new Error('GOOGLE_CALENDAR_CREATE_FAILED'));

    await createCalendarEventWithSync(input);

    expect(mockDeleteGoogleCalendarEvent).not.toHaveBeenCalled();
  });

  it('still adds the event to Apple when checking Google fails', async () => {
    mockCheckCalendarProviders.mockResolvedValue([
      { provider: 'apple', status: 'connected' },
      { provider: 'google', status: 'check-failed', error: new Error('Network request failed') },
    ]);

    const result = await createCalendarEventWithSync(input);

    expect(result.status).toBe('partial');
    expect(result.providerResults).toEqual([
      { provider: 'google', status: 'failed', error: 'Network request failed' },
      { provider: 'apple', status: 'synced' },
    ]);
    expect(mockCreateAppleCalendarEvent).toHaveBeenCalled();
    expect(mockCreateGoogleCalendarEvent).not.toHaveBeenCalled();
  });

  it('still adds the event to Google when checking Apple fails', async () => {
    mockCheckCalendarProviders.mockResolvedValue([
      { provider: 'apple', status: 'check-failed', error: new Error('Calendar permission error') },
      { provider: 'google', status: 'connected' },
    ]);

    const result = await createCalendarEventWithSync(input);

    expect(result.status).toBe('partial');
    expect(mockCreateGoogleCalendarEvent).toHaveBeenCalled();
    expect(mockCreateAppleCalendarEvent).not.toHaveBeenCalled();
  });

  it('reports a failure when no calendar could be checked', async () => {
    mockCheckCalendarProviders.mockResolvedValue([
      { provider: 'apple', status: 'check-failed', error: new Error('Network request failed') },
      { provider: 'google', status: 'check-failed', error: new Error('Network request failed') },
    ]);

    const result = await createCalendarEventWithSync(input);

    expect(result.status).toBe('failed');
    expect(result.providerResults).toHaveLength(2);
    expect(result.event).toEqual(savedEvent);
  });

  it('sends nothing anywhere when saving in RISE fails', async () => {
    mockCreateCalendarEvent.mockRejectedValue(new Error('permission denied for table calendar_events'));

    await expect(createCalendarEventWithSync(input)).rejects.toThrow('permission denied');
    expect(mockCheckCalendarProviders).not.toHaveBeenCalled();
    expect(mockCreateGoogleCalendarEvent).not.toHaveBeenCalled();
  });

  it("doesn't check calendars while the login skip is on", async () => {
    mockDevFlags.skipAuth = true;

    const result = await createCalendarEventWithSync(input);

    expect(result.status).toBe('saved-only');
    expect(mockCheckCalendarProviders).not.toHaveBeenCalled();
  });
});
