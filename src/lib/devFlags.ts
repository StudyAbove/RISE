/**
 * Development-only switches, read from .env. They are always off in release
 * builds because `__DEV__` is false there.
 */

/**
 * Skips login and shows sample data instead of Supabase data, for testing
 * screens without a magic link. Turn on with EXPO_PUBLIC_DEV_SKIP_AUTH=true in .env.
 */
export const DEV_SKIP_AUTH =
  __DEV__ && process.env.EXPO_PUBLIC_DEV_SKIP_AUTH === 'true';
