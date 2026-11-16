import Storage from 'expo-sqlite/kv-store';

/**
 * RISE's saved notification preference.
 *
 * This is separate from the device's notification permission:
 * - this value says whether the student wants RISE reminders
 * - iOS/Android permission says whether the device allows them
 */
const NOTIFICATIONS_ENABLED_KEY =
  'rise.notificationsEnabled';

/**
 * Notifications are enabled by default until the student
 * explicitly turns them off in Settings.
 */
export function loadNotificationsEnabled(): boolean {
  try {
    const saved =
      Storage.getItemSync(
        NOTIFICATIONS_ENABLED_KEY,
      );

    if (saved === 'false') {
      return false;
    }

    if (saved === 'true') {
      return true;
    }

    return true;
  } catch (error) {
    console.log(
      'Could not load notification preference:',
      error,
    );

    return true;
  }
}

/**
 * Saves whether the student wants RISE to schedule
 * academic reminder notifications.
 */
export function saveNotificationsEnabled(
  enabled: boolean,
): void {
  try {
    Storage.setItemSync(
      NOTIFICATIONS_ENABLED_KEY,
      enabled ? 'true' : 'false',
    );
  } catch (error) {
    console.log(
      'Could not save notification preference:',
      error,
    );
  }
}
