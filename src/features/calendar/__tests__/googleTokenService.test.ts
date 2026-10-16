import * as SecureStore from 'expo-secure-store';

import {
  clearGoogleAccessToken,
  getGoogleAccessToken,
  saveGoogleAccessToken,
} from '../services/googleTokenService';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockSetItemAsync =
  SecureStore.setItemAsync as jest.Mock;

const mockGetItemAsync =
  SecureStore.getItemAsync as jest.Mock;

const mockDeleteItemAsync =
  SecureStore.deleteItemAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('googleTokenService', () => {
  it('saves the Google Calendar access token securely', async () => {
    mockSetItemAsync.mockResolvedValue(undefined);

    await saveGoogleAccessToken(
      'google-access-token',
    );

    expect(
      mockSetItemAsync,
    ).toHaveBeenCalledWith(
      'rise_google_calendar_access_token',
      'google-access-token',
    );
  });

  it('loads the saved Google Calendar access token', async () => {
    mockGetItemAsync.mockResolvedValue(
      'google-access-token',
    );

    await expect(
      getGoogleAccessToken(),
    ).resolves.toBe(
      'google-access-token',
    );

    expect(
      mockGetItemAsync,
    ).toHaveBeenCalledWith(
      'rise_google_calendar_access_token',
    );
  });

  it('returns null when no Google Calendar access token is stored', async () => {
    mockGetItemAsync.mockResolvedValue(null);

    await expect(
      getGoogleAccessToken(),
    ).resolves.toBeNull();
  });

  it('removes the Google Calendar access token', async () => {
    mockDeleteItemAsync.mockResolvedValue(
      undefined,
    );

    await clearGoogleAccessToken();

    expect(
      mockDeleteItemAsync,
    ).toHaveBeenCalledWith(
      'rise_google_calendar_access_token',
    );
  });

  it('passes SecureStore errors back to the caller', async () => {
    const storageError =
      new Error('SecureStore failed');

    mockSetItemAsync.mockRejectedValue(
      storageError,
    );

    await expect(
      saveGoogleAccessToken(
        'google-access-token',
      ),
    ).rejects.toBe(storageError);
  });
});