import { render, screen } from '@testing-library/react-native';

import { EventSourceLegend } from '../components/EventSourceLegend';

describe('EventSourceLegend', () => {
  it('shows every source by name', async () => {
    await render(<EventSourceLegend />);

    for (const name of ['RISE', 'Google', 'Apple', 'Canvas']) {
      expect(screen.getByText(name)).toBeOnTheScreen();
    }
  });

  it('reads the full calendar names to VoiceOver as one item', async () => {
    await render(<EventSourceLegend />);

    expect(
      screen.getByLabelText('Event sources: RISE, Google Calendar, Apple Calendar, Canvas'),
    ).toBeOnTheScreen();
  });
});
