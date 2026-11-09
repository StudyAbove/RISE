import { useRef } from 'react';
import type { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { TabPageHeader } from '../TabPageHeader';

const mockSky = jest.fn();

jest.mock('../../features/home/components/HomeSkyBackdrop', () => ({
  HomeSkyBackdrop: (props: { bottom: number; timeOfDay: string }) => {
    mockSky(props);
    return null;
  },
}));

jest.mock('../../features/settings/components/SettingsButton', () => ({
  SettingsButton: () => null,
}));

jest.mock('../../hooks/useCurrentDate', () => ({
  // 2 PM, so the afternoon sky.
  useCurrentDate: () => new Date(2026, 10, 9, 14, 0),
}));

function Header({ subtitle }: { subtitle?: string }) {
  const titleRef = useRef<Text>(null);
  return <TabPageHeader title="Analytics" subtitle={subtitle} titleRef={titleRef} />;
}

// Pretends the header text was laid out, ending 120pt down the page.
async function layOutHeader() {
  const header = screen.getByRole('header').parent!.parent!;
  await fireEvent(header, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 120 } } });
}

describe('TabPageHeader', () => {
  beforeEach(() => {
    mockSky.mockClear();
  });

  it('shows the title and subtitle', async () => {
    await render(<Header subtitle="Your progress tells a bigger story." />);

    expect(screen.getByRole('header', { name: 'Analytics' })).toBeOnTheScreen();
    expect(screen.getByText('Your progress tells a bigger story.')).toBeOnTheScreen();
  });

  it('ends the sky just under the subtitle, like Home', async () => {
    await render(<Header subtitle="Look at an overview of the future" />);
    await layOutHeader();

    expect(mockSky).toHaveBeenLastCalledWith({ timeOfDay: 'afternoon', bottom: 128 });
  });

  it('gives a page without a subtitle the same sky as one with', async () => {
    // Without a subtitle the text ends 19pt higher, so lay it out that way.
    await render(<Header />);
    const header = screen.getByRole('header').parent!.parent!;
    await fireEvent(header, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 101 } } });

    expect(mockSky).toHaveBeenLastCalledWith({ timeOfDay: 'afternoon', bottom: 128 });
  });
});
