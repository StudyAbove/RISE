import * as SecureStore from 'expo-secure-store';

const GOOGLE_ACCESS_TOKEN_KEY =
  'rise_google_calendar_access_token';

// Added in #123 so the access token can be renewed instead of expiring for good.
const GOOGLE_REFRESH_TOKEN_KEY =
  'rise_google_calendar_refresh_token';

const GOOGLE_ACCESS_TOKEN_EXPIRES_AT_KEY =
  'rise_google_calendar_access_token_expires_at';

const GOOGLE_TOKEN_URL =
  'https://oauth2.googleapis.com/token';

// Renew a little early, so a token can't expire between the check and the request.
const RENEW_BEFORE_EXPIRY_MS =
  60 * 1000;

/** Extra details Google returns with an access token when the student connects. */
export interface GoogleTokenDetails {
  refreshToken?: string;
  /** Seconds the access token is valid for (usually 3600). */
  expiresIn?: number;
  /** Seconds since 1970 when Google issued it; defaults to now. */
  issuedAt?: number;
}

type GoogleTokenRefreshResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
};

/**
 * Saves the Google access token, plus (since #123) the refresh token and
 * when the access token expires, so getGoogleAccessToken can renew it.
 */
export async function saveGoogleAccessToken(
  accessToken: string,
  details: GoogleTokenDetails = {},
) {
  await SecureStore.setItemAsync(
    GOOGLE_ACCESS_TOKEN_KEY,
    accessToken,
  );

  if (details.refreshToken) {
    await SecureStore.setItemAsync(
      GOOGLE_REFRESH_TOKEN_KEY,
      details.refreshToken,
    );
  }

  if (details.expiresIn) {
    const issuedAtMs =
      (details.issuedAt ?? Date.now() / 1000) * 1000;

    await SecureStore.setItemAsync(
      GOOGLE_ACCESS_TOKEN_EXPIRES_AT_KEY,
      String(issuedAtMs + details.expiresIn * 1000),
    );
  } else {
    await SecureStore.deleteItemAsync(
      GOOGLE_ACCESS_TOKEN_EXPIRES_AT_KEY,
    );
  }
}

/**
 * A Google access token that's ready to use, or null when the student needs
 * to reconnect Google.
 *
 * Google access tokens only last about an hour. When the saved one has
 * expired (or is about to), the refresh token is used to get a new one
 * quietly. Tokens saved before #123 have no refresh token or expiry, so
 * they're returned as they are and Google decides (an expired one leads to
 * a reconnect, as before).
 */
export async function getGoogleAccessToken(): Promise<
  string | null
> {
  const accessToken =
    await SecureStore.getItemAsync(
      GOOGLE_ACCESS_TOKEN_KEY,
    );

  const expiresAt = Number(
    await SecureStore.getItemAsync(
      GOOGLE_ACCESS_TOKEN_EXPIRES_AT_KEY,
    ),
  );

  const stillFresh =
    !expiresAt ||
    Number.isNaN(expiresAt) ||
    Date.now() < expiresAt - RENEW_BEFORE_EXPIRY_MS;

  if (accessToken && stillFresh) {
    return accessToken;
  }

  const refreshToken =
    await SecureStore.getItemAsync(
      GOOGLE_REFRESH_TOKEN_KEY,
    );

  const clientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  if (!refreshToken || !clientId) {
    return accessToken;
  }

  const response = await fetch(
    GOOGLE_TOKEN_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    },
  );

  // Google refuses a refresh token the student revoked or that expired; only
  // reconnecting can fix that.
  if (
    response.status === 400 ||
    response.status === 401
  ) {
    await clearGoogleAccessToken();
    return null;
  }

  if (!response.ok) {
    throw new Error(
      'GOOGLE_TOKEN_REFRESH_FAILED',
    );
  }

  const data: GoogleTokenRefreshResponse =
    await response.json();

  if (!data.access_token) {
    throw new Error(
      'GOOGLE_TOKEN_REFRESH_FAILED',
    );
  }

  await saveGoogleAccessToken(
    data.access_token,
    {
      // Google usually keeps the same refresh token.
      refreshToken:
        data.refresh_token ?? refreshToken,
      expiresIn:
        data.expires_in,
    },
  );

  return data.access_token;
}

/** Forgets the Google connection's tokens on this phone. */
export async function clearGoogleAccessToken() {
  await SecureStore.deleteItemAsync(
    GOOGLE_ACCESS_TOKEN_KEY,
  );
  await SecureStore.deleteItemAsync(
    GOOGLE_REFRESH_TOKEN_KEY,
  );
  await SecureStore.deleteItemAsync(
    GOOGLE_ACCESS_TOKEN_EXPIRES_AT_KEY,
  );
}
