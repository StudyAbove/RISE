import { fireEvent, render, screen } from '@testing-library/react-native';

import { HelpPopup } from '../components/HelpPopup';

describe('HelpPopup', () => {
  it('offers breathing, an extension, and office hours', async () => {
    await render(<HelpPopup visible onSelect={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'Feeling stuck?' })).toBeOnTheScreen();
    expect(
      screen.getByText('Pick what would help most right now. You can always come back to this.'),
    ).toBeOnTheScreen();

    for (const label of ['Take a breath', 'Ask for an extension', 'Book office hours', 'Not right now']) {
      expect(screen.getByRole('button', { name: label })).toBeOnTheScreen();
    }
  });

  it.each([
    ['Take a breath', 'breathing'],
    ['Ask for an extension', 'extension'],
    ['Book office hours', 'officeHours'],
  ])('reports "%s" as %s', async (label, option) => {
    const onSelect = jest.fn();

    await render(<HelpPopup visible onSelect={onSelect} onClose={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: label }));

    expect(onSelect).toHaveBeenCalledWith(option);
  });

  it('closes with "Not right now"', async () => {
    const onClose = jest.fn();

    await render(<HelpPopup visible onSelect={jest.fn()} onClose={onClose} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Not right now' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows nothing while closed', async () => {
    await render(<HelpPopup visible={false} onSelect={jest.fn()} onClose={jest.fn()} />);

    expect(screen.queryByText('Feeling stuck?')).toBeNull();
  });
});
