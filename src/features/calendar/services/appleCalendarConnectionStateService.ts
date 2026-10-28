import Storage from 'expo-sqlite/kv-store';

import type {
  AppleCalendarAccess,
} from './calendarService';

const PENDING_APPLE_CONNECTION_KEY =
  'rise.pendingAppleCalendarConnection';

const LAST_APPLE_ACCESS_KEY =
  'rise.lastAppleCalendarAccess';

/**
 * Marks that the user intentionally started connecting
 * Apple Calendar and was sent to iOS Settings to finish
 * granting Full Calendar Access.
 *
 * This survives an Expo/dev-client reload.
 */
export async function markAppleCalendarConnectionPending() {
  await Storage.setItem(
    PENDING_APPLE_CONNECTION_KEY,
    'true',
  );
}

/**
 * Returns true only while RISE is waiting for the user
 * to finish the initial Apple Calendar connection flow.
 */
export async function isAppleCalendarConnectionPending() {
  const value =
    await Storage.getItem(
      PENDING_APPLE_CONNECTION_KEY,
    );

  return value === 'true';
}

/**
 * Clears the pending initial-connection state after
 * Apple Calendar has successfully connected.
 */
export async function clearAppleCalendarConnectionPending() {
  await Storage.removeItem(
    PENDING_APPLE_CONNECTION_KEY,
  );
}

/**
 * Stores the most recent Apple Calendar permission state
 * that RISE observed.
 *
 * This allows RISE to distinguish a normal launch where
 * access stayed Full from a real reconnect where access
 * changed from unavailable back to Full.
 */
export async function saveLastAppleCalendarAccess(
  access: AppleCalendarAccess,
) {
  await Storage.setItem(
    LAST_APPLE_ACCESS_KEY,
    access,
  );
}

/**
 * Returns the Apple Calendar permission state that RISE
 * observed previously.
 *
 * null means RISE has not recorded a permission state yet.
 */
export async function getLastAppleCalendarAccess():
  Promise<AppleCalendarAccess | null> {
  const value =
    await Storage.getItem(
      LAST_APPLE_ACCESS_KEY,
    );

  if (
    value === 'full' ||
    value === 'write-only' ||
    value === 'denied'
  ) {
    return value;
  }

  return null;
}

/**
 * Clears Apple Calendar state stored locally by RISE.
 *
 * Account deletion removes RISE's remembered connection
 * state only. It does not change the device's actual
 * Calendar permission or delete anything from Apple Calendar.
 */
export async function clearAppleCalendarConnectionState() {
  await Promise.all([
    Storage.removeItem(
      PENDING_APPLE_CONNECTION_KEY,
    ),
    Storage.removeItem(
      LAST_APPLE_ACCESS_KEY,
    ),
  ]);
}
