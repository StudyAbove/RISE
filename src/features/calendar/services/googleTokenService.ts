import * as SecureStore from 'expo-secure-store';

const GOOGLE_ACCESS_TOKEN_KEY =
  'rise_google_calendar_access_token';

export async function saveGoogleAccessToken(
  accessToken: string,
) {
  await SecureStore.setItemAsync(
    GOOGLE_ACCESS_TOKEN_KEY,
    accessToken,
  );
}

export async function getGoogleAccessToken(): Promise<
  string | null
> {
  return SecureStore.getItemAsync(
    GOOGLE_ACCESS_TOKEN_KEY,
  );
}

export async function clearGoogleAccessToken() {
  await SecureStore.deleteItemAsync(
    GOOGLE_ACCESS_TOKEN_KEY,
  );
}