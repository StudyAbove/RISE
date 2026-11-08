import { render, screen } from '@testing-library/react-native';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { EventChip } from '../components/EventChip';

const chemLab: CalendarEvent = {
  id: 'event-1',
  userId: 'user-1',
  title: 'Chem Lab',
  startAt: new Date(2026, 10, 18, 9).toISOString(),
  endAt: new Date(2026, 10, 18, 10).toISOString(),
  source: 'rise',
  eventType: 'class',
};

describe('EventChip event type (#38)', () => {
  it('puts the type on its own line under the title when there is room', async () => {
    await render(<EventChip event={chemLab} size="regular" maxTitleLines={2} />);

    expect(screen.getByText('Class')).toBeOnTheScreen();
    // The type takes the second line, so the title keeps one.
    expect(screen.getByText('Chem Lab')).toHaveProp('numberOfLines', 1);
  });

  it('puts the type after the title on a one-line chip', async () => {
    await render(<EventChip event={{ ...chemLab, title: 'Gym', eventType: 'wellness' }} size="regular" />);

    expect(screen.getByText('· Wellness')).toBeOnTheScreen();
    expect(screen.getByText('Gym')).toHaveProp('numberOfLines', 1);
  });

  it.each(['compact', 'mini'] as const)('leaves the type off %s chips, which are too small', async (size) => {
    await render(<EventChip event={chemLab} size={size} maxTitleLines={2} />);

    expect(screen.queryByText(/Class/)).not.toBeOnTheScreen();
  });

  it.each(['regular', 'compact', 'mini'] as const)('names the type for VoiceOver on %s chips', async (size) => {
    await render(<EventChip event={chemLab} size={size} />);

    expect(screen.getByLabelText('Chem Lab, Class, RISE, 9:00 AM to 10:00 AM')).toBeOnTheScreen();
  });

  it('shows no type, and reads as before, when the event has none', async () => {
    const { eventType: _, ...untyped } = chemLab;
    await render(<EventChip event={untyped} size="regular" maxTitleLines={2} />);

    expect(screen.queryByText(/Class/)).not.toBeOnTheScreen();
    expect(screen.getByText('Chem Lab')).toHaveProp('numberOfLines', 2);
    expect(screen.getByLabelText('Chem Lab, RISE, 9:00 AM to 10:00 AM')).toBeOnTheScreen();
  });
});
