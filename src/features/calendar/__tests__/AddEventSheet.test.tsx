import { Keyboard } from 'react-native';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { format, parseISO } from 'date-fns';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { AddEventSheet } from '../components/addEvent/AddEventSheet';

const mockCreateCalendarEvent = jest.fn();
// The form's job ends at handing the event to the sync service, so that's
// faked here; mockCreateCalendarEvent stands in for the RISE save, and no
// external calendar is connected.
jest.mock('../services/calendarEventSyncService', () => ({
  createCalendarEventWithSync: async (input: unknown) => ({
    event: await mockCreateCalendarEvent(input),
    status: 'saved-only',
    providerResults: [],
  }),
}));

// Shows a saved time in the phone's time zone, e.g. "2026-11-18 09:00".
const localTime = (iso: string) => format(parseISO(iso), 'yyyy-MM-dd HH:mm');

const savedEvent: CalendarEvent = {
  id: 'event-1',
  userId: 'user-1',
  title: 'Chem Lab',
  startAt: '2026-11-18T17:00:00.000Z',
  endAt: '2026-11-18T18:00:00.000Z',
  source: 'rise',
};

async function renderSheet() {
  const onClose = jest.fn();
  const onSaved = jest.fn();
  const result = await render(<AddEventSheet visible onClose={onClose} onSaved={onSaved} />);
  return { ...result, onClose, onSaved };
}

// Fills in the three required fields: "Chem Lab" on Wednesday, November 18 at 9:00 AM.
async function fillRequiredFields() {
  await fireEvent.changeText(screen.getByLabelText('Title'), 'Chem Lab');
  await fireEvent.press(screen.getByRole('button', { name: /^Date,/ }));
  await fireEvent.press(screen.getByRole('button', { name: 'Wednesday, November 18' }));
  await fireEvent.press(screen.getByRole('button', { name: /^Start time,/ }));
  await fireEvent.press(screen.getByRole('button', { name: '9:00 AM' }));
}

// Pin "today" to Friday, November 13, 2026.
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 10, 13, 9, 30) });
  mockCreateCalendarEvent.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('AddEventSheet', () => {
  it('opens as an empty "Add to Calendar" form', async () => {
    await renderSheet();

    expect(screen.getByRole('header', { name: 'Add to Calendar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Date, Select a date' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Start time, Start' })).toBeOnTheScreen();
    // End can be picked before Start.
    expect(screen.getByRole('button', { name: 'End time, End' })).toBeEnabled();
  });

  describe('required fields (AC4)', () => {
    it('does not save, and shows what is missing, when everything is blank', async () => {
      await renderSheet();

      await fireEvent.press(screen.getByRole('button', { name: 'Add Event' }));

      expect(screen.getByText('Add a title')).toBeOnTheScreen();
      expect(screen.getByText('Pick a date')).toBeOnTheScreen();
      expect(screen.getByText('Pick a time')).toBeOnTheScreen();
      expect(mockCreateCalendarEvent).not.toHaveBeenCalled();
    });

    it('shows no messages before the first try to save', async () => {
      await renderSheet();

      expect(screen.queryByText('Pick a date')).not.toBeOnTheScreen();
    });

    it('clears each message as its field is filled in', async () => {
      await renderSheet();
      await fireEvent.press(screen.getByRole('button', { name: 'Add Event' }));

      await fireEvent.changeText(screen.getByLabelText('Title'), 'Chem Lab');

      expect(screen.queryByText('Add a title')).not.toBeOnTheScreen();
      expect(screen.getByText('Pick a date')).toBeOnTheScreen();
    });

    it('still refuses a title of only spaces', async () => {
      await renderSheet();
      await fillRequiredFields();
      await fireEvent.changeText(screen.getByLabelText('Title'), '   ');

      await fireEvent.press(screen.getByRole('button', { name: 'Add Event' }));

      expect(screen.getByText('Add a title')).toBeOnTheScreen();
      expect(mockCreateCalendarEvent).not.toHaveBeenCalled();
    });
  });

  describe('saving (AC2)', () => {
    it('saves the title, date, and time, ending 1 hour later by default', async () => {
      mockCreateCalendarEvent.mockResolvedValue(savedEvent);
      const { onSaved } = await renderSheet();
      await fillRequiredFields();

      expect(screen.getByRole('button', { name: 'End time, 10:00 AM' })).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Add Event' }));

      const saved = mockCreateCalendarEvent.mock.calls[0][0];
      expect(saved.title).toBe('Chem Lab');
      expect(localTime(saved.startAt)).toBe('2026-11-18 09:00');
      expect(localTime(saved.endAt)).toBe('2026-11-18 10:00');
      expect(onSaved).toHaveBeenCalledWith({ event: savedEvent, status: 'saved-only', providerResults: [] });
    });

    it('saves a chosen end time, type, location, and reminder', async () => {
      mockCreateCalendarEvent.mockResolvedValue(savedEvent);
      await renderSheet();
      await fillRequiredFields();

      await fireEvent.press(screen.getByRole('button', { name: /^End time,/ }));
      await fireEvent.press(screen.getByRole('button', { name: '11:30 AM' }));
      await fireEvent.press(screen.getByRole('radio', { name: 'Class' }));
      await fireEvent.changeText(screen.getByLabelText('Location'), 'Room 204');
      await fireEvent.press(screen.getByRole('button', { name: /^Reminder,/ }));
      await fireEvent.press(screen.getByRole('button', { name: '1 day before' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Add Event' }));

      const saved = mockCreateCalendarEvent.mock.calls[0][0];
      expect(localTime(saved.endAt)).toBe('2026-11-18 11:30');
      expect(saved).toMatchObject({ eventType: 'class', location: 'Room 204', reminderMinutes: 1440 });
    });

    // #38 AC1: every type can be chosen and is saved with the event.
    it.each([
      ['Class', 'class'],
      ['Assignment', 'assignment'],
      ['Study', 'study'],
      ['Personal', 'personal'],
      ['Wellness', 'wellness'],
    ])('saves the %s type', async (label, eventType) => {
      mockCreateCalendarEvent.mockResolvedValue(savedEvent);
      await renderSheet();
      await fillRequiredFields();

      await fireEvent.press(screen.getByRole('radio', { name: label }));
      await fireEvent.press(screen.getByRole('button', { name: 'Add Event' }));

      expect(mockCreateCalendarEvent.mock.calls[0][0].eventType).toBe(eventType);
    });

    it('keeps a chosen end when a new start is still before it', async () => {
      await renderSheet();
      await fillRequiredFields();
      await fireEvent.press(screen.getByRole('button', { name: /^End time,/ }));
      await fireEvent.press(screen.getByRole('button', { name: '3:00 PM' }));

      await fireEvent.press(screen.getByRole('button', { name: /^Start time,/ }));
      await fireEvent.press(screen.getByRole('button', { name: '1:00 PM' }));

      expect(screen.getByRole('button', { name: 'End time, 3:00 PM' })).toBeOnTheScreen();
    });

    it('moves the end to 1 hour after a new start that passes it', async () => {
      await renderSheet();
      await fillRequiredFields();

      await fireEvent.press(screen.getByRole('button', { name: /^Start time,/ }));
      await fireEvent.press(screen.getByRole('button', { name: '1:00 PM' }));

      // 9:00–10:00 AM moved to start at 1:00 PM.
      expect(screen.getByRole('button', { name: 'End time, 2:00 PM' })).toBeOnTheScreen();
    });

    it('lets End be picked first', async () => {
      mockCreateCalendarEvent.mockResolvedValue(savedEvent);
      await renderSheet();
      await fireEvent.changeText(screen.getByLabelText('Title'), 'Chem Lab');
      await fireEvent.press(screen.getByRole('button', { name: /^Date,/ }));
      await fireEvent.press(screen.getByRole('button', { name: 'Wednesday, November 18' }));

      await fireEvent.press(screen.getByRole('button', { name: /^End time,/ }));
      await fireEvent.press(screen.getByRole('button', { name: '12:00 PM' }));
      // Start is still required.
      await fireEvent.press(screen.getByRole('button', { name: 'Add Event' }));
      expect(screen.getByText('Pick a time')).toBeOnTheScreen();
      expect(mockCreateCalendarEvent).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByRole('button', { name: /^Start time,/ }));
      await fireEvent.press(screen.getByRole('button', { name: '10:00 AM' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Add Event' }));

      const saved = mockCreateCalendarEvent.mock.calls[0][0];
      expect(localTime(saved.startAt)).toBe('2026-11-18 10:00');
      expect(localTime(saved.endAt)).toBe('2026-11-18 12:00');
    });

    it('shows "Adding…" and ignores extra taps while saving', async () => {
      // The test decides when saving finishes.
      let finishSaving: (event: CalendarEvent) => void = () => {};
      mockCreateCalendarEvent.mockReturnValue(new Promise((resolve) => (finishSaving = resolve)));
      const { onSaved } = await renderSheet();
      await fillRequiredFields();

      // Not awaited: the tap's work only finishes once saving does. Starting
      // another act() now would overlap the tap's own, so instead give the tap
      // a few promise turns to finish updating the screen.
      const tap = fireEvent.press(screen.getByRole('button', { name: 'Add Event' }));
      for (let turn = 0; turn < 5; turn += 1) {
        await Promise.resolve();
      }

      expect(screen.getByText('Adding…')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Add Event' })).toBeDisabled();
      expect(mockCreateCalendarEvent).toHaveBeenCalledTimes(1);

      await act(async () => finishSaving(savedEvent));
      await tap;
      expect(onSaved).toHaveBeenCalledWith({ event: savedEvent, status: 'saved-only', providerResults: [] });
    });

    it('keeps what was entered and explains when saving fails', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      mockCreateCalendarEvent.mockRejectedValue(new Error('permission denied for table calendar_events'));
      const { onSaved } = await renderSheet();
      await fillRequiredFields();

      await fireEvent.press(screen.getByRole('button', { name: 'Add Event' }));

      expect(await screen.findByText("Couldn't add the event. Check your connection and try again.")).toBeOnTheScreen();
      expect(screen.getByLabelText('Title')).toHaveDisplayValue('Chem Lab');
      expect(screen.getByRole('button', { name: 'Add Event' })).toBeEnabled();
      expect(onSaved).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('dropdowns', () => {
    it('keeps only one dropdown open at a time', async () => {
      await renderSheet();

      await fireEvent.press(screen.getByRole('button', { name: /^Date,/ }));
      await fireEvent.press(screen.getByRole('button', { name: /^Reminder,/ }));

      expect(screen.getByRole('button', { name: /^Reminder,/ })).toBeExpanded();
      expect(screen.getByRole('button', { name: /^Date,/ })).not.toBeExpanded();
      expect(screen.queryByRole('header', { name: 'November 2026' })).not.toBeOnTheScreen();
    });

    it('closes a dropdown after a choice and shows the choice', async () => {
      await renderSheet();

      await fireEvent.press(screen.getByRole('button', { name: /^Date,/ }));
      await fireEvent.press(screen.getByRole('button', { name: 'Wednesday, November 18' }));

      expect(screen.getByRole('button', { name: 'Date, Wednesday, November 18, 2026' })).not.toBeExpanded();
    });
  });

  describe('keyboard and scrolling', () => {
    it('closes the keyboard when empty space is tapped', async () => {
      const dismiss = jest.spyOn(Keyboard, 'dismiss');
      await renderSheet();

      await fireEvent.press(screen.getByRole('header', { name: 'Add to Calendar' }));

      expect(dismiss).toHaveBeenCalled();
      dismiss.mockRestore();
    });

    it('closes the keyboard when a dropdown opens', async () => {
      const dismiss = jest.spyOn(Keyboard, 'dismiss');
      await renderSheet();
      await fireEvent.changeText(screen.getByLabelText('Location'), 'Room 204');

      await fireEvent.press(screen.getByRole('button', { name: /^Date,/ }));

      expect(dismiss).toHaveBeenCalled();
      dismiss.mockRestore();
    });

    it('floats the time list over the form, and closes it by tapping outside', async () => {
      await renderSheet();

      await fireEvent.press(screen.getByRole('button', { name: /^Start time,/ }));
      expect(screen.getByRole('button', { name: /^Start time,/ })).toBeExpanded();
      expect(screen.getByRole('button', { name: '9:00 AM' })).toBeOnTheScreen();
      // The list floats outside the form instead of being placed inside it.
      expect(within(screen.getByTestId('add-event-form')).queryByRole('button', { name: '9:00 AM' })).not.toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Close Start time' }));

      expect(screen.queryByRole('button', { name: '9:00 AM' })).not.toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Start time, Start' })).not.toBeExpanded();
    });
  });

  it('closes with the X', async () => {
    const { onClose } = await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('starts empty again the next time it opens', async () => {
    const { rerender, onClose, onSaved } = await renderSheet();
    await fireEvent.changeText(screen.getByLabelText('Title'), 'Draft');

    await rerender(<AddEventSheet visible={false} onClose={onClose} onSaved={onSaved} />);
    await rerender(<AddEventSheet visible onClose={onClose} onSaved={onSaved} />);
    await act(async () => {});

    expect(screen.getByLabelText('Title')).toHaveDisplayValue('');
  });
});
