import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AppState,
  Text,
  View,
} from 'react-native';

import NotificationIcon from '../../../../assets/icons/notifications.svg';

import {
  loadNotificationsEnabled,
  saveNotificationsEnabled,
} from '../../notifications/services/notificationPreferenceService';

import {
  areDeviceNotificationsAllowed,
  cancelPendingNotifications,
  ensureNotificationPermission,
} from '../../notifications/services/notificationService';

import {
  SettingsToggle,
} from './SettingsToggle';

import {
  styles,
} from './NotificationSettingsRow.styles';

export function NotificationSettingsRow() {
  const [
    notificationsEnabled,
    setNotificationsEnabled,
  ] = useState(
    loadNotificationsEnabled,
  );

  const [
    isUpdating,
    setIsUpdating,
  ] = useState(false);

  const waitingForSystemSettings =
    useRef(false);

  useEffect(() => {
    async function syncWithDevicePermission() {
      try {
        const allowed =
          await areDeviceNotificationsAllowed();

        const savedPreference =
          loadNotificationsEnabled();

        if (!allowed) {
          waitingForSystemSettings.current =
            false;

          if (savedPreference) {
            saveNotificationsEnabled(
              false,
            );
          }

          setNotificationsEnabled(
            false,
          );

          return;
        }

        if (
          waitingForSystemSettings.current
        ) {
          waitingForSystemSettings.current =
            false;

          saveNotificationsEnabled(
            true,
          );

          setNotificationsEnabled(
            true,
          );

          return;
        }

        setNotificationsEnabled(
          savedPreference,
        );
      } catch (error) {
        console.log(
          'Could not sync notification permission:',
          error,
        );
      }
    }

    void syncWithDevicePermission();

    const subscription =
      AppState.addEventListener(
        'change',
        state => {
          if (state === 'active') {
            void syncWithDevicePermission();
          }
        },
      );

    return () => {
      subscription.remove();
    };
  }, []);

  async function handleToggle() {
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);

    try {
      if (notificationsEnabled) {
        saveNotificationsEnabled(
          false,
        );

        setNotificationsEnabled(
          false,
        );

        await cancelPendingNotifications();

        return;
      }

      const permissionGranted =
        await ensureNotificationPermission(
          () => {
            waitingForSystemSettings.current =
              true;
          },
        );

      if (!permissionGranted) {
        saveNotificationsEnabled(
          false,
        );

        setNotificationsEnabled(
          false,
        );

        return;
      }

      saveNotificationsEnabled(
        true,
      );

      setNotificationsEnabled(
        true,
      );
    } catch (error) {
      console.log(
        'Could not update notification setting:',
        error,
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <View
      style={styles.card}
    >
      <NotificationIcon
        width={24}
        height={24}
        style={styles.icon}
      />

      <Text
        style={styles.label}
      >
        Notifications
      </Text>

      <SettingsToggle
        value={
          notificationsEnabled
        }
        onPress={
          handleToggle
        }
        label="Notifications"
        disabled={isUpdating}
      />
    </View>
  );
}
