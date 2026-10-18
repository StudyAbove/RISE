import { getCalendarPermissions, getDefaultCalendarSync } from 'expo-calendar';

import { createAppleCalendarEvent } from '../services/calendarService';

jest.mock('expo-calendar', () => ({
  getCalendarPermissions: jest.fn(),
  requestCalendarPermissions: jest.fn(),
  getDefaultCalendarSync: jest.fn(),
  ExpoCalendarEvent: { get: jest.fn() },
}));

const mockGetCalendarPermissions = getCalendarPermissions as jest.Mock;
const mockGetDefaultCalendar = getDefaultCalendarSync as jest.Mock;
const mockCreateEvent = jest.fn();

const lab = {
  title: 'Chem Lab',
  startAt: '2026-11-18T17:00:00.000Z',
  endAt: '2026-11-18T18:00:00.000Z',
  location: ' Room 204 ',
  reminderMinutes: 180,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCalendarPermissions.mockResolvedValue({ status: 'granted' });
  mockGetDefaultCalendar.mockReturnValue({ id: 'apple-default', createEvent: mockCreateEvent });
  mockCreateEvent.mockResolvedValue({
    id: 'apple-event-1',
    calendarId: 'apple-default',
    lastModifiedDate: '2026-11-13T09:31:00.000Z',
  });
});

describe('createAppleCalendarEvent', () => {
  it("adds the event to the phone's default calendar and returns its ids", async () => {
    await expect(createAppleCalendarEvent(lab)).resolves.toEqual({
      externalEventId: 'apple-event-1',
      externalCalendarId: 'apple-default',
      updatedAt: '2026-11-13T09:31:00.000Z',
    });
  });

  it('sends the title, times, trimmed location, notes, and reminder as an alert', async () => {
    await createAppleCalendarEvent({ ...lab, description: 'Bring goggles' });

    expect(mockCreateEvent).toHaveBeenCalledWith({
      title: 'Chem Lab',
      startDate: new Date('2026-11-18T17:00:00.000Z'),
      endDate: new Date('2026-11-18T18:00:00.000Z'),
      location: 'Room 204',
      notes: 'Bring goggles',
      // 3 hours before the start.
      alarms: [{ relativeOffset: -180 }],
    });
  });

  it('leaves out blank details and alerts when none were chosen', async () => {
    await createAppleCalendarEvent({ ...lab, location: '  ', reminderMinutes: undefined });

    expect(mockCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({ location: undefined, notes: undefined, alarms: undefined })
    );
  });

  it('refuses without Full Access, since only that counts as connected', async () => {
    // Neither full access nor write-only access is granted.
    mockGetCalendarPermissions.mockResolvedValue({ status: 'denied' });

    await expect(createAppleCalendarEvent(lab)).rejects.toThrow('APPLE_CALENDAR_NOT_CONNECTED');
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  it('reports when the phone has no default calendar for new events', async () => {
    mockGetDefaultCalendar.mockImplementation(() => {
      throw new Error('No default calendar');
    });

    await expect(createAppleCalendarEvent(lab)).rejects.toThrow('APPLE_DEFAULT_CALENDAR_MISSING');
  });
});
