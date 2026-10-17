import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { CanvasSettingsModal } from '../components/CanvasSettingsModal';

const mockCreateExtensionPairingCode = jest.fn();
const mockFetchCanvasConnection = jest.fn();

jest.mock('../../../repositories/canvasRepository', () => ({
  createExtensionPairingCode: () => mockCreateExtensionPairingCode(),
  fetchCanvasConnection: () => mockFetchCanvasConnection(),
}));

const NOW = new Date(2026, 10, 13, 12, 0, 0);

describe('CanvasSettingsModal', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    jest.clearAllMocks();

    mockCreateExtensionPairingCode.mockResolvedValue({
      code: '482913',
      expiresAt: new Date(NOW.getTime() + 10 * 60 * 1000),
    });
    mockFetchCanvasConnection.mockResolvedValue({
      lastSyncedAt: new Date(NOW.getTime() - 12 * 60 * 1000),
      lastSyncStatus: 'success',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows a code to type into the extension and the last sync', async () => {
    await render(<CanvasSettingsModal visible onClose={jest.fn()} />);

    expect(await screen.findByText('482 913')).toBeOnTheScreen();
    expect(screen.getByText('Expires in 10:00')).toBeOnTheScreen();
    expect(screen.getByText('Last synced 12 min ago')).toBeOnTheScreen();
  });

  it('offers a new code once the old one expires', async () => {
    await render(<CanvasSettingsModal visible onClose={jest.fn()} />);
    await screen.findByText('482 913');

    await act(async () => {
      jest.advanceTimersByTime(10 * 60 * 1000);
    });

    expect(screen.getByText('Code expired')).toBeOnTheScreen();

    mockCreateExtensionPairingCode.mockResolvedValueOnce({
      code: '105377',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await fireEvent.press(screen.getByRole('button', { name: 'New code' }));

    expect(await screen.findByText('105 377')).toBeOnTheScreen();
  });

  it('says when the extension has never synced', async () => {
    mockFetchCanvasConnection.mockResolvedValueOnce(null);

    await render(<CanvasSettingsModal visible onClose={jest.fn()} />);

    expect(await screen.findByText('Not synced yet')).toBeOnTheScreen();
  });
});
