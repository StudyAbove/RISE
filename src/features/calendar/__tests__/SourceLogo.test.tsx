import { render, screen } from '@testing-library/react-native';

import { eventSourceColors } from '../calendarColors';
import { SourceLogo } from '../components/SourceLogo';

describe('SourceLogo', () => {
  it('draws the logo at the given size', async () => {
    await render(<SourceLogo testID="logo" source="google" size={10} />);

    expect(screen.getByTestId('logo')).toHaveStyle({ width: 10, height: 10 });
  });

  it('darkens the white Apple logo so it shows on light backgrounds', async () => {
    await render(<SourceLogo testID="logo" source="apple" size={10} />);

    expect(screen.getByTestId('logo')).toHaveStyle({ tintColor: '#1E1E1E' });
  });

  it.each(['rise', 'google', 'canvas'] as const)('keeps the %s logo in its own colors', async (source) => {
    await render(<SourceLogo testID="logo" source={source} size={10} />);

    expect(screen.getByTestId('logo')).not.toHaveStyle({ tintColor: '#1E1E1E' });
  });

  // The text or VoiceOver label next to it names the source, so it isn't read twice.
  it('is hidden from VoiceOver', async () => {
    await render(<SourceLogo testID="logo" source="canvas" size={10} />);

    expect(screen.getByTestId('logo').props.accessible).toBe(false);
  });
});

describe('eventSourceColors', () => {
  it('gives every source its own tab color', () => {
    const tabColors = Object.values(eventSourceColors);

    expect(new Set(tabColors).size).toBe(tabColors.length);
    // Google is blue now, so it no longer looks like Apple's green.
    expect(eventSourceColors.google).toBe('#8CA6DD');
  });
});
