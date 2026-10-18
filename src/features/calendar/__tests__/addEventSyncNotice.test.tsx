import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { AddEventSyncNotice } from '../components/AddEventSyncNotice';
import type { CalendarEventSyncResult } from '../services/calendarEventSyncService';
import { getAddEventSyncMessage } from '../utils/addEventSyncMessage';

const event: CalendarEvent = {
  id: 'rise-event-1',
  userId: 'user-1',
  title: 'Chem Lab',
  startAt: '2026-11-18T17:00:00.000Z',
  endAt: '2026-11-18T18:00:00.000Z',
  source: 'rise',
};

const result = (
  status: CalendarEventSyncResult['status'],
  providerResults: CalendarEventSyncResult['providerResults'] = []
): CalendarEventSyncResult => ({ event, status, providerResults });

describe('getAddEventSyncMessage', () => {
  it('says nothing when every connected calendar got the event, or none is connected', () => {
    expect(getAddEventSyncMessage(result('synced', [{ provider: 'google', status: 'synced' }]))).toBeNull();
    expect(getAddEventSyncMessage(result('saved-only'))).toBeNull();
  });

  it('asks to reconnect Google when its access expired', () => {
    expect(
      getAddEventSyncMessage(
        result('failed', [{ provider: 'google', status: 'failed', error: 'GOOGLE_CALENDAR_RECONNECT_REQUIRED' }])
      )
    ).toBe("Added to RISE, but couldn't add it to Google Calendar. Reconnect Google in Settings.");
  });

  it('asks to turn on Full Access when Apple Calendar access is off', () => {
    expect(
      getAddEventSyncMessage(
        result('partial', [
          { provider: 'apple', status: 'failed', error: 'APPLE_CALENDAR_NOT_CONNECTED' },
          { provider: 'google', status: 'synced' },
        ])
      )
    ).toBe("Added to RISE, but couldn't add it to Apple Calendar. Turn on Full Access for RISE in Settings.");
  });

  it('names the calendar for other failures', () => {
    expect(
      getAddEventSyncMessage(result('failed', [{ provider: 'google', status: 'failed', error: 'GOOGLE_CALENDAR_CREATE_FAILED' }]))
    ).toBe("Added to RISE, but couldn't add it to Google Calendar.");
  });

  it('covers both calendars failing at once', () => {
    expect(
      getAddEventSyncMessage(
        result('failed', [
          { provider: 'apple', status: 'failed', error: 'APPLE_DEFAULT_CALENDAR_MISSING' },
          { provider: 'google', status: 'failed', error: 'GOOGLE_CALENDAR_CREATE_FAILED' },
        ])
      )
    ).toBe("Added to RISE, but couldn't add it to Google or Apple Calendar.");
  });

  it('explains when the connected calendars could not be checked', () => {
    expect(getAddEventSyncMessage(result('failed'))).toBe(
      "Added to RISE, but couldn't reach your connected calendars."
    );
  });
});

describe('AddEventSyncNotice', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the message and goes away when tapped', async () => {
    const onDismiss = jest.fn();
    await render(<AddEventSyncNotice message="Added to RISE, but couldn't add it to Google Calendar." onDismiss={onDismiss} />);

    await fireEvent.press(screen.getByText("Added to RISE, but couldn't add it to Google Calendar."));

    expect(onDismiss).toHaveBeenCalled();
  });

  it('goes away on its own after a few seconds', async () => {
    const onDismiss = jest.fn();
    await render(<AddEventSyncNotice message="Added to RISE, but couldn't add it to Google Calendar." onDismiss={onDismiss} />);

    await act(async () => {
      jest.advanceTimersByTime(5900);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(onDismiss).toHaveBeenCalled();
  });
});
