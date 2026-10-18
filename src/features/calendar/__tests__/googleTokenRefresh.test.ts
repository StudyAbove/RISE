import * as SecureStore from 'expo-secure-store';

import {
  clearGoogleAccessToken,
  getGoogleAccessToken,
  saveGoogleAccessToken,
} from '../services/googleTokenService';

// A pretend SecureStore that remembers values, so saving and loading work together.
const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
}));

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

const ACCESS = 'rise_google_calendar_access_token';
const REFRESH = 'rise_google_calendar_refresh_token';
const EXPIRES_AT = 'rise_google_calendar_access_token_expires_at';

const NOW = new Date('2026-11-13T09:00:00.000Z').getTime();
const minutes = (count: number) => count * 60 * 1000;

function saveTokens(expiresAtMs: number | null, refreshToken: string | null = 'refresh-1') {
  mockStore.set(ACCESS, 'access-old');
  if (expiresAtMs !== null) mockStore.set(EXPIRES_AT, String(expiresAtMs));
  if (refreshToken) mockStore.set(REFRESH, refreshToken);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.clear();
  jest.useFakeTimers({ now: NOW });
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-client-id.apps.googleusercontent.com';
});

afterEach(() => {
  jest.useRealTimers();
});

describe('saving Google tokens', () => {
  it('keeps the refresh token and when the access token expires', async () => {
    await saveGoogleAccessToken('access-1', {
      refreshToken: 'refresh-1',
      expiresIn: 3600,
      issuedAt: NOW / 1000,
    });

    expect(mockStore.get(ACCESS)).toBe('access-1');
    expect(mockStore.get(REFRESH)).toBe('refresh-1');
    expect(Number(mockStore.get(EXPIRES_AT))).toBe(NOW + minutes(60));
  });

  it('forgets all of them on clear', async () => {
    saveTokens(NOW + minutes(30));

    await clearGoogleAccessToken();

    expect(mockStore.size).toBe(0);
  });
});

describe('getGoogleAccessToken', () => {
  it('returns a token that is still fresh without contacting Google', async () => {
    saveTokens(NOW + minutes(30));

    await expect(getGoogleAccessToken()).resolves.toBe('access-old');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('quietly renews an expired token with the refresh token', async () => {
    saveTokens(NOW - minutes(5));
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'access-new', expires_in: 3600 }),
    });

    await expect(getGoogleAccessToken()).resolves.toBe('access-new');

    const [url, request] = mockFetch.mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(request.method).toBe('POST');
    expect(Object.fromEntries(new URLSearchParams(request.body))).toEqual({
      client_id: 'ios-client-id.apps.googleusercontent.com',
      grant_type: 'refresh_token',
      refresh_token: 'refresh-1',
    });
    // The new token is saved, valid for another hour, and the refresh token kept.
    expect(mockStore.get(ACCESS)).toBe('access-new');
    expect(Number(mockStore.get(EXPIRES_AT))).toBe(NOW + minutes(60));
    expect(mockStore.get(REFRESH)).toBe('refresh-1');
  });

  it('renews a token that expires within the next minute', async () => {
    saveTokens(NOW + 30 * 1000);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'access-new', expires_in: 3600 }),
    });

    await expect(getGoogleAccessToken()).resolves.toBe('access-new');
  });

  it('asks the student to reconnect when Google refuses the refresh token', async () => {
    saveTokens(NOW - minutes(5));
    mockFetch.mockResolvedValue({ ok: false, status: 400 });

    await expect(getGoogleAccessToken()).resolves.toBeNull();
    expect(mockStore.size).toBe(0);
  });

  it('keeps the tokens and reports an error when Google cannot be reached', async () => {
    saveTokens(NOW - minutes(5));
    mockFetch.mockResolvedValue({ ok: false, status: 503 });

    await expect(getGoogleAccessToken()).rejects.toThrow('GOOGLE_TOKEN_REFRESH_FAILED');
    expect(mockStore.get(REFRESH)).toBe('refresh-1');
  });

  it('renews when only a refresh token is saved', async () => {
    mockStore.set(REFRESH, 'refresh-1');
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'access-new', expires_in: 3600 }),
    });

    await expect(getGoogleAccessToken()).resolves.toBe('access-new');
  });

  it('returns a token saved before refresh tokens existed as it is', async () => {
    // No expiry and no refresh token, like a connection made before #123.
    saveTokens(null, null);

    await expect(getGoogleAccessToken()).resolves.toBe('access-old');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
