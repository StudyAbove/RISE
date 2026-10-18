import { Alert, type AlertButton } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { format, parseISO } from 'date-fns';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { EventDetailsSheet } from '../components/EventDetailsSheet';
import { formatEventTime } from '../components/TodayEventsCard';
import { CalendarEventDeleteError } from '../services/calendarEventSyncService';
import { getDeleteConfirmMessage, getDeleteErrorMessage } from '../utils/deleteEventMessages';
import { EVENT_SOURCE_LABELS, formatReminder } from '../utils/eventLabels';

// Which calendars the event has copies in; none unless a test says otherwise.
const mockGetCalendarEventLinks = jest.fn();
jest.mock('../../../repositories/calendarEventLinksRepository', () => ({
  getCalendarEventLinks: (...args: unknown[]) => mockGetCalendarEventLinks(...args),
}));

const basicEvent: CalendarEvent = {
  id: 'event-1',
  userId: 'user-1',
  title: 'Biology Lab Report',
  startAt: '2026-11-18T17:00:00.000Z',
  endAt: '2026-11-18T18:30:00.000Z',
  source: 'rise',
};

const fullEvent: CalendarEvent = {
  ...basicEvent,
  eventType: 'assignment',
  location: 'Hall of Science 210',
  reminderMinutes: 24 * 60,
  description: 'Bring the lab notebook.',
};

async function renderSheet(
  event: CalendarEvent | null,
  conflictOrDelete:
    | boolean
    | ((event: CalendarEvent) => Promise<void>) = false,
  readOnly = false,
  providerSources: Array<'apple' | 'google'> = [],
) {
  const hasUnresolvedConflict =
    typeof conflictOrDelete === 'boolean'
      ? conflictOrDelete
      : false;

  const onDelete =
    typeof conflictOrDelete === 'function'
      ? conflictOrDelete
      : jest.fn().mockResolvedValue(undefined);

  const onClose = jest.fn();
  const onEdit = jest.fn();
  const onReviewConflict = jest.fn();

  const result = await render(
    <EventDetailsSheet
      visible
      event={event}
      hasUnresolvedConflict={hasUnresolvedConflict}
      readOnly={readOnly}
      providerSources={providerSources}
      onClose={onClose}
      onEdit={onEdit}
      onReviewConflict={onReviewConflict}
      onDelete={onDelete}
    />,
  );

  return {
    ...result,
    onClose,
    onEdit,
    onReviewConflict,
    onDelete,
  };
}

const alertSpy = jest
  .spyOn(
    Alert,
    'alert',
  )
  .mockImplementation(
    () => {},
  );

beforeEach(() => {
  alertSpy.mockClear();

  mockGetCalendarEventLinks
    .mockReset()
    .mockResolvedValue([]);
});

// Presses a button in the most recent alert, the way a student would.
async function pressAlertButton(
  text: string,
) {
  const buttons: AlertButton[] =
    alertSpy.mock.calls.at(-1)?.[2] ??
    [];

  await act(async () => {
    buttons
      .find(
        (button) =>
          button.text === text,
      )
      ?.onPress?.();
  });
}

describe('EventDetailsSheet', () => {
  it('shows the title, date, time, and where the event came from (AC2)', async () => {
    await renderSheet(basicEvent);

    expect(screen.getByRole('header', { name: 'Biology Lab Report' })).toBeTruthy();
    // Dates show in the phone's time zone.
    expect(screen.getByText(new RegExp(format(parseISO(basicEvent.startAt), 'EEEE, MMMM d, yyyy')))).toBeTruthy();
    expect(screen.getByText(new RegExp(formatEventTime(basicEvent)))).toBeTruthy();
    expect(screen.getByText('From RISE')).toBeTruthy();
  });

  it('hides optional details the event does not have', async () => {
    await renderSheet(basicEvent);

    expect(screen.queryByText('Assignment')).toBeNull();
    expect(screen.queryByText(/Reminder:/)).toBeNull();
    expect(screen.queryByText('Notes')).toBeNull();
  });

  it('shows saved optional details (AC2)', async () => {
    await renderSheet(fullEvent);

    expect(screen.getByText('Assignment')).toBeTruthy();
    expect(screen.getByText('Hall of Science 210')).toBeTruthy();
    expect(screen.getByText('Reminder: 1 day before')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Notes' })).toBeTruthy();
    expect(screen.getByText('Bring the lab notebook.')).toBeTruthy();
  });

  it('hides Notes when the description is only spaces', async () => {
    await renderSheet({ ...basicEvent, description: '   ' });

    expect(screen.queryByText('Notes')).toBeNull();
  });

  it.each(['google', 'apple', 'canvas'] as const)('names %s events by their calendar', async (source) => {
    await renderSheet({ ...basicEvent, source });

    expect(screen.getByText(`From ${EVENT_SOURCE_LABELS[source]}`)).toBeTruthy();
  });

  it('darkens the white Apple logo so it shows on the card', async () => {
    await renderSheet({ ...basicEvent, source: 'apple' });

    expect(screen.getByTestId('event-source-logo')).toHaveStyle({ tintColor: '#1E1E1E' });
  });

  it('colors the top circle by event type', async () => {
    await renderSheet(fullEvent);

    expect(screen.getByTestId('event-type-circle')).toHaveStyle({ backgroundColor: '#FFF1B8' });
  });

  it('closes with the ✕ (AC3)', async () => {
    const { onClose } = await renderSheet(basicEvent);

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('passes the event to Edit', async () => {
    const { onEdit } = await renderSheet(fullEvent);

    await fireEvent.press(screen.getByRole('button', { name: 'Edit' }));

    expect(onEdit).toHaveBeenCalledWith(fullEvent);
  });

  describe('Delete (#80)', () => {
    it('asks before deleting (AC2)', async () => {
      const { onDelete } = await renderSheet(basicEvent);

      await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

      expect(alertSpy).toHaveBeenCalledWith('Delete "Biology Lab Report"?', "This can't be undone.", [
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Delete', style: 'destructive' }),
      ]);
      expect(onDelete).not.toHaveBeenCalled();
    });

    // A RISE event that was also added to Google and Apple (#123) is deleted
    // from all three, so the warning has to name both, whatever its source.
    it('names every calendar the event will also be deleted from', async () => {
      mockGetCalendarEventLinks.mockResolvedValue([
        { id: 'link-1', calendarEventId: 'event-1', userId: 'user-1', provider: 'apple', externalEventId: 'apple-1' },
        { id: 'link-2', calendarEventId: 'event-1', userId: 'user-1', provider: 'google', externalEventId: 'google-1', externalCalendarId: 'primary' },
      ]);
      await renderSheet(basicEvent);

      await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

      expect(mockGetCalendarEventLinks).toHaveBeenCalledWith('event-1');
      expect(alertSpy.mock.calls.at(-1)?.[1]).toBe(
        "This can't be undone. It will also be removed from Google Calendar and Apple Calendar.",
      );
    });

    it('still warns about synced copies when the calendars cannot be checked', async () => {
      mockGetCalendarEventLinks.mockRejectedValue(new Error('Network request failed'));
      await renderSheet(basicEvent);

      await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

      expect(alertSpy.mock.calls.at(-1)?.[1]).toBe(
        "This can't be undone. It will also be removed from any calendar it's synced with.",
      );
    });

    it('keeps the event when the student cancels (AC4)', async () => {
      const { onDelete } = await renderSheet(basicEvent);

      await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
      await pressAlertButton('Cancel');

      expect(onDelete).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
    });

    it('deletes the event once confirmed (AC3)', async () => {
      const { onDelete } = await renderSheet(fullEvent);

      await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
      await pressAlertButton('Delete');

      expect(onDelete).toHaveBeenCalledWith(fullEvent);
    });

    it('shows "Deleting…" and waits while the delete runs', async () => {
      let finishDelete = () => {};
      const onDelete = jest.fn(() => new Promise<void>((resolve) => (finishDelete = resolve)));
      await renderSheet(basicEvent, onDelete);

      await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
      await pressAlertButton('Delete');

      expect(screen.getByText('Deleting…')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Deleting' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();

      await act(async () => finishDelete());
    });

    it('explains a failed delete and keeps the event (AC8)', async () => {
      const error = new CalendarEventDeleteError('GOOGLE_CALENDAR_RECONNECT_REQUIRED', 'google');
      await renderSheet(basicEvent, jest.fn().mockRejectedValue(error));

      await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
      await pressAlertButton('Delete');

      expect(alertSpy).toHaveBeenLastCalledWith("Couldn't delete event", getDeleteErrorMessage(error));
      expect(screen.getByRole('header', { name: 'Biology Lab Report' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
    });
  });

  it('requires conflict review before Edit or Delete are available', async () => {
    await renderSheet(fullEvent, true);

    expect(screen.getByRole('header', { name: 'Calendar conflict' })).toBeTruthy();
    expect(
      screen.getByText(
        'This event was changed or deleted in more than one calendar. Review the differences before editing or deleting it.',
      ),
    ).toBeTruthy();

    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Review Conflict' })).toBeTruthy();
  });

  it('passes the event to Review Conflict', async () => {
    const { onReviewConflict } =
      await renderSheet(fullEvent, true);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Review Conflict' }),
    );

    expect(onReviewConflict).toHaveBeenCalledWith(fullEvent);
  });

  it('shows a read-only notice instead of Edit and Delete', async () => {
    await renderSheet(
      {
        ...basicEvent,
        source: 'apple',
      },
      false,
      true,
      ['apple'],
    );

    expect(
      screen.getByRole('header', {
        name: 'Read-only calendar event',
      }),
    ).toBeTruthy();

    expect(
      screen.getByText(
        'This event is controlled by a connected calendar and cannot be edited or deleted in RISE.',
      ),
    ).toBeTruthy();

    expect(
      screen.queryByRole('button', {
        name: 'Edit',
      }),
    ).toBeNull();

    expect(
      screen.queryByRole('button', {
        name: 'Delete',
      }),
    ).toBeNull();
  });

  it('shows both providers for a deduplicated Apple and Google event', async () => {
    await renderSheet(
      {
        ...basicEvent,
        source: 'google',
      },
      false,
      false,
      [
        'apple',
        'google',
      ],
    );

    expect(
      screen.getByText(
        'From Apple Calendar + Google Calendar',
      ),
    ).toBeTruthy();

    expect(
      screen.getByTestId(
        'event-source-logo-apple',
      ),
    ).toBeTruthy();

    expect(
      screen.getByTestId(
        'event-source-logo-google',
      ),
    ).toBeTruthy();
  });

  it('keeps a RISE-created event labeled From RISE even when provider copies exist', async () => {
    await renderSheet(
      basicEvent,
      false,
      false,
      [
        'apple',
        'google',
      ],
    );

    expect(
      screen.getByText('From RISE'),
    ).toBeTruthy();

    expect(
      screen.queryByText(
        'From Apple Calendar + Google Calendar',
      ),
    ).toBeNull();
  });

  it('gives conflict review priority over the read-only notice', async () => {
    await renderSheet(
      {
        ...basicEvent,
        source: 'apple',
      },
      true,
      true,
      ['apple'],
    );

    expect(
      screen.getByRole('button', {
        name: 'Review Conflict',
      }),
    ).toBeTruthy();

    expect(
      screen.queryByRole('header', {
        name: 'Read-only calendar event',
      }),
    ).toBeNull();
  });

  it('shows only the close button when there is no event', async () => {
    await renderSheet(null);

    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  });
});

describe('formatReminder', () => {
  it('uses the Add Event label for a standard choice', () => {
    expect(formatReminder(24 * 60)).toBe('1 day before');
  });

  it('writes other amounts in the largest whole unit', () => {
    expect(formatReminder(2 * 24 * 60)).toBe('2 days before');
    expect(formatReminder(120)).toBe('2 hours before');
    expect(formatReminder(45)).toBe('45 minutes before');
    expect(formatReminder(1)).toBe('1 minute before');
  });
});

describe('delete messages', () => {
  it('names each linked calendar in the confirmation', () => {
    expect(getDeleteConfirmMessage([])).toBe("This can't be undone.");
    expect(getDeleteConfirmMessage(['google'])).toBe("This can't be undone. It will also be removed from Google Calendar.");
    expect(getDeleteConfirmMessage(['apple'])).toBe("This can't be undone. It will also be removed from Apple Calendar.");
    expect(getDeleteConfirmMessage(['google', 'apple'])).toBe(
      "This can't be undone. It will also be removed from Google Calendar and Apple Calendar.",
    );
  });

  it.each([
    [
      new CalendarEventDeleteError('GOOGLE_CALENDAR_RECONNECT_REQUIRED', 'google'),
      'The event is still on your calendar. Reconnect Google Calendar in Settings, then try again.',
    ],
    [
      new CalendarEventDeleteError('APPLE_CALENDAR_NOT_CONNECTED', 'apple'),
      'The event is still on your calendar. RISE needs Full Calendar Access to remove it from Apple Calendar. Turn it on in Settings, then try again.',
    ],
    [
      new CalendarEventDeleteError('GOOGLE_CALENDAR_DELETE_FAILED', 'google'),
      "The event is still on your calendar. It couldn't be removed from Google Calendar. Check your connection and try again.",
    ],
    [new Error('Network request failed'), 'The event is still on your calendar. Check your connection and try again.'],
  ])('explains %s', (error, message) => {
    expect(getDeleteErrorMessage(error)).toBe(message);
  });
});
