import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

/**
 * Returns whether the device currently allows RISE
 * to display notification reminders.
 *
 * On iOS, provisional authorization is also sufficient
 * for RISE to schedule non-interruptive notifications.
 */
export async function areDeviceNotificationsAllowed():
  Promise<boolean> {
  const permissions =
    await Notifications.getPermissionsAsync();

  if (permissions.granted) {
    return true;
  }

  return (
    permissions.ios?.status ===
    Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

/**
 * Makes sure RISE has device notification permission.
 *
 * If permission is already available, no prompt appears.
 * Otherwise the system permission prompt is requested.
 */
export async function ensureNotificationPermission(
  onOpenSettings?: () => void,
): Promise<boolean> {
  const current =
    await Notifications.getPermissionsAsync();

  if (
    current.granted ||
    current.ios?.status ===
      Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }

  if (current.canAskAgain === false) {
    onOpenSettings?.();
    await Linking.openSettings();
    return false;
  }

  const permissions =
    await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

  if (permissions.granted) {
    return true;
  }

  if (
    permissions.ios?.status ===
    Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }

  if (permissions.canAskAgain === false) {
    onOpenSettings?.();
    await Linking.openSettings();
  }

  return false;
}

/**
 * Removes every pending RISE local notification.
 *
 * #84 requires pending academic reminders to disappear
 * when the student turns notifications off.
 *
 * RISE currently schedules notifications only for its own
 * reminder system, so cancelling all scheduled app
 * notifications is appropriate here.
 */
export async function cancelPendingNotifications():
  Promise<void> {
  await Notifications
    .cancelAllScheduledNotificationsAsync();
}
