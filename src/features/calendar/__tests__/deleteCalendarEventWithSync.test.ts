import type { CalendarEvent } from '../../../models/CalendarEvent';
import type { CalendarEventLink } from '../../../models/CalendarEventLink';
import { getCalendarEventLinks } from '../../../repositories/calendarEventLinksRepository';
import { deleteCalendarEvent } from '../../../repositories/calendarEventsRepository';
import { deleteAppleCalendarEvent } from '../services/calendarService';
import {
  CalendarEventDeleteError,
  deleteCalendarEventWithSync,
  getLinkedCalendarProviders,
} from '../services/calendarEventSyncService';
import { deleteGoogleCalendarEvent } from '../services/googleCalendarService';

// Lets each test turn the dev login skip on or off.
const mockDevFlags = { skipAuth: false };

jest.mock('../../../lib/devFlags', () => ({
  get DEV_SKIP_AUTH() {
    return mockDevFlags.skipAuth;
  },
}));

jest.mock('../../../repositories/calendarEventLinksRepository', () => ({
  getCalendarEventLinks: jest.fn(),
}));

jest.mock('../../../repositories/calendarEventsRepository', () => ({
  deleteCalendarEvent: jest.fn(),
}));

jest.mock('../services/calendarService', () => ({
  deleteAppleCalendarEvent: jest.fn(),
}));

jest.mock('../services/googleCalendarService', () => ({
  deleteGoogleCalendarEvent: jest.fn(),
}));

const mockGetLinks = getCalendarEventLinks as jest.Mock;
const mockDeleteRiseEvent = deleteCalendarEvent as jest.Mock;
const mockDeleteAppleEvent = deleteAppleCalendarEvent as jest.Mock;
const mockDeleteGoogleEvent = deleteGoogleCalendarEvent as jest.Mock;

const event: CalendarEvent = {
  id: 'event-1',
  userId: 'user-1',
  title: 'Bio Lab',
  startAt: '2026-11-13T17:00:00.000Z',
  endAt: '2026-11-13T18:00:00.000Z',
  source: 'google',
};

const googleLink: CalendarEventLink = {
  id: 'link-google',
  calendarEventId: 'event-1',
  userId: 'user-1',
  provider: 'google',
  externalEventId: 'google-event-1',
  externalCalendarId: 'student@example.com',
  isWritable: true,
  isAllDay: false,
};

const appleLink: CalendarEventLink = {
  id: 'link-apple',
  calendarEventId: 'event-1',
  userId: 'user-1',
  provider: 'apple',
  externalEventId: 'apple-event-1',
  isWritable: true,
  isAllDay: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDevFlags.skipAuth = false;
  mockGetLinks.mockResolvedValue([]);
  mockDeleteRiseEvent.mockResolvedValue(undefined);
  mockDeleteAppleEvent.mockResolvedValue(undefined);
  mockDeleteGoogleEvent.mockResolvedValue(undefined);
});

describe('deleteCalendarEventWithSync', () => {
  it('deletes a RISE-only event from RISE', async () => {
    await deleteCalendarEventWithSync(event);

    expect(mockDeleteRiseEvent).toHaveBeenCalledWith('event-1');
    expect(mockDeleteGoogleEvent).not.toHaveBeenCalled();
    expect(mockDeleteAppleEvent).not.toHaveBeenCalled();
  });

  it('deletes the Google and Apple copies before the RISE event', async () => {
    mockGetLinks.mockResolvedValue([googleLink, appleLink]);
    const order: string[] = [];
    mockDeleteGoogleEvent.mockImplementation(async () => order.push('google'));
    mockDeleteAppleEvent.mockImplementation(async () => order.push('apple'));
    mockDeleteRiseEvent.mockImplementation(async () => order.push('rise'));

    await deleteCalendarEventWithSync(event);

    expect(mockDeleteGoogleEvent).toHaveBeenCalledWith('google-event-1', 'student@example.com');
    // Apple gets the date too, so only that occurrence of a repeating event is removed.
    expect(mockDeleteAppleEvent).toHaveBeenCalledWith('apple-event-1', event.startAt);
    expect(order).toEqual(['google', 'apple', 'rise']);
  });

  it('keeps the RISE event when a copy cannot be deleted, and says which calendar', async () => {
    mockGetLinks.mockResolvedValue([googleLink]);
    mockDeleteGoogleEvent.mockRejectedValue(new Error('GOOGLE_CALENDAR_RECONNECT_REQUIRED'));

    const error = await deleteCalendarEventWithSync(event).catch((caught) => caught);

    expect(error).toBeInstanceOf(CalendarEventDeleteError);
    expect(error).toMatchObject({ provider: 'google', message: 'GOOGLE_CALENDAR_RECONNECT_REQUIRED' });
    expect(mockDeleteRiseEvent).not.toHaveBeenCalled();
  });

  it('fails without deleting anything when a Google link has no calendar ID', async () => {
    mockGetLinks.mockResolvedValue([{ ...googleLink, externalCalendarId: undefined }]);

    await expect(deleteCalendarEventWithSync(event)).rejects.toMatchObject({ provider: 'google' });
    expect(mockDeleteGoogleEvent).not.toHaveBeenCalled();
    expect(mockDeleteRiseEvent).not.toHaveBeenCalled();
  });

  it('fails when the links cannot be loaded, without deleting anything', async () => {
    mockGetLinks.mockRejectedValue(new Error('offline'));

    await expect(deleteCalendarEventWithSync(event)).rejects.toThrow('offline');
    expect(mockDeleteRiseEvent).not.toHaveBeenCalled();
  });

  it('reports a RISE delete failure with no calendar named', async () => {
    mockDeleteRiseEvent.mockRejectedValue(new Error('Calendar event could not be found or deleted.'));

    const error = await deleteCalendarEventWithSync(event).catch((caught) => caught);

    expect(error).toBeInstanceOf(CalendarEventDeleteError);
    expect(error.provider).toBeUndefined();
  });

  it('skips the link lookup while the login skip is on', async () => {
    mockDevFlags.skipAuth = true;

    await deleteCalendarEventWithSync(event);

    expect(mockGetLinks).not.toHaveBeenCalled();
    expect(mockDeleteRiseEvent).toHaveBeenCalledWith('event-1');
  });
});

describe('getLinkedCalendarProviders', () => {
  it('lists the calendars the event has copies in, Google first', async () => {
    mockGetLinks.mockResolvedValue([appleLink, googleLink]);

    await expect(getLinkedCalendarProviders('event-1')).resolves.toEqual(['google', 'apple']);
    expect(mockGetLinks).toHaveBeenCalledWith('event-1');
  });

  it('is empty for an event with no copies', async () => {
    await expect(getLinkedCalendarProviders('event-1')).resolves.toEqual([]);
  });

  it('skips the link lookup while the login skip is on', async () => {
    mockDevFlags.skipAuth = true;

    await expect(getLinkedCalendarProviders('event-1')).resolves.toEqual([]);
    expect(mockGetLinks).not.toHaveBeenCalled();
  });
});
