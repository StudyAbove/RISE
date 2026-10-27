import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

const calendarConnectIcon =
  require('../../../../assets/icons/calendar-connect.png');

const appleIcon =
  require('../../../../assets/icons/apple.png');

const googleIcon =
  require('../../../../assets/icons/google.png');

const trashIcon =
  require('../../../../assets/icons/trash.png');

type CalendarConnectionModalProps = {
  visible: boolean;
  appleConnected: boolean;
  googleConnected: boolean;
  googleEmail: string | null;
  isConnectingApple?: boolean;
  isConnectingGoogle?: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  onConnectApple: () => void;
  onConnectGoogle: () => void;
  onDisconnectApple?: () => void;
  onDisconnectGoogle?: () => void;
};

export function CalendarConnectionModal({
  visible,
  appleConnected,
  googleConnected,
  googleEmail,
  isConnectingApple = false,
  isConnectingGoogle = false,
  onClose,
  onDismiss,
  onConnectApple,
  onConnectGoogle,
  onDisconnectApple,
  onDisconnectGoogle,
}: CalendarConnectionModalProps) {
  const isInitialAppleSyncRunning =
    appleConnected &&
    isConnectingApple;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={
        isInitialAppleSyncRunning
          ? undefined
          : onClose
      }
      onDismiss={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {!isInitialAppleSyncRunning && (
            <Pressable
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close calendar connection modal"
            >
              <Text style={styles.closeText}>
                ×
              </Text>
            </Pressable>
          )}

          <View style={styles.calendarIconOuter}>
            <View style={styles.calendarIconInner}>
              <Image
                source={calendarConnectIcon}
                style={styles.calendarIcon}
                resizeMode="contain"
              />
            </View>
          </View>

          <Text style={styles.modalTitle}>
            Import your calendar
          </Text>

          <Text style={styles.modalMessage}>
            {isInitialAppleSyncRunning
              ? 'Syncing your Apple Calendar events with RISE. This may take a few seconds.'
              : 'Connect Apple or Google Calendar to sync your schedule and get smarter study planning.'}
          </Text>

          <View style={styles.modalActions}>
            {appleConnected ? (
              <View style={styles.appleConnectedCard}>
                <View style={styles.connectedCheckCircle}>
                  <Text style={styles.connectedCheckText}>
                    {isInitialAppleSyncRunning
                      ? '↻'
                      : '✓'}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.appleConnectedText,
                    {
                      flex: 1,
                    },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {isInitialAppleSyncRunning
                    ? 'Syncing Apple Calendar...'
                    : 'Apple Calendar Connected'}
                </Text>

                {!isInitialAppleSyncRunning && (
                  <Pressable
                    onPress={onDisconnectApple}
                    disabled={!onDisconnectApple}
                    style={({ pressed }) => [
                      styles.trashButton,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Disconnect Apple Calendar"
                  >
                    <Image
                      source={trashIcon}
                      style={styles.trashIcon}
                      resizeMode="contain"
                    />
                  </Pressable>
                )}
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.calendarButton,
                  styles.appleButton,
                  pressed && styles.pressed,
                  isConnectingApple &&
                    styles.disabledButton,
                ]}
                onPress={onConnectApple}
                disabled={isConnectingApple}
                accessibilityRole="button"
                accessibilityLabel="Connect Apple Calendar"
              >
                <Image
                  source={appleIcon}
                  style={styles.appleIcon}
                  resizeMode="contain"
                />

                <Text style={styles.appleButtonText}>
                  {isConnectingApple
                    ? 'Connecting Apple Calendar...'
                    : 'Connect Apple Calendar'}
                </Text>
              </Pressable>
            )}

            {googleConnected ? (
              <View
                style={[
                  styles.googleConnectedCard,
                  isInitialAppleSyncRunning &&
                    styles.disabledButton,
                ]}
              >
                <View style={styles.googleConnectedContent}>
                  <Text
                    style={styles.googleConnectedEmail}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {googleEmail ??
                      'yourname@gmail.com'}
                  </Text>

                  <View style={styles.googleConnectedBottomRow}>
                    <View style={styles.syncDot} />

                    <Text style={styles.syncText}>
                      Sync
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={onDisconnectGoogle}
                  disabled={
                    !onDisconnectGoogle ||
                    isInitialAppleSyncRunning
                  }
                  style={({ pressed }) => [
                    styles.trashButton,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Disconnect Google Calendar"
                >
                  <Image
                    source={trashIcon}
                    style={styles.trashIcon}
                    resizeMode="contain"
                  />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.calendarButton,
                  styles.googleButton,
                  pressed &&
                    !isInitialAppleSyncRunning &&
                    styles.pressed,
                  (
                    isConnectingGoogle ||
                    isInitialAppleSyncRunning
                  ) &&
                    styles.disabledButton,
                ]}
                onPress={onConnectGoogle}
                disabled={
                  isConnectingGoogle ||
                  isInitialAppleSyncRunning
                }
                accessibilityRole="button"
                accessibilityLabel="Connect Google Calendar"
              >
                <Image
                  source={googleIcon}
                  style={styles.providerIcon}
                  resizeMode="contain"
                />

                <Text style={styles.googleButtonText}>
                  {isConnectingGoogle
                    ? 'Connecting Google Calendar...'
                    : 'Connect Google Calendar'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCard: {
    width: 324,
    borderRadius: 16,
    backgroundColor: colors.softWhite,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },

  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  closeText: {
    fontFamily: fonts.body.regular,
    fontSize: 30,
    lineHeight: 30,
    color: '#000000',
  },

  calendarIconOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(67, 119, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarIconInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(67, 119, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarIcon: {
    width: 24,
    height: 24,
  },

  modalTitle: {
    marginTop: 12,
    fontFamily: fonts.heading.bold,
    fontSize: 20,
    lineHeight: 27,
    color: '#000000',
    textAlign: 'center',
  },

  modalMessage: {
    width: 276,
    marginTop: 16,
    fontFamily: fonts.body.medium,
    fontSize: 14,
    lineHeight: 20,
    color: '#71717B',
    textAlign: 'center',
  },

  modalActions: {
    width: 276,
    gap: 10,
    marginTop: 20,
  },

  calendarButton: {
    width: 276,
    height: 50,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  appleButton: {
    backgroundColor: '#000000',
  },

  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
  },

  appleIcon: {
    width: 22,
    height: 22,
    marginRight: 8,
    transform: [{ translateY: -1 }],
  },

  providerIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },

  appleButtonText: {
    fontFamily: fonts.heading.bold,
    fontSize: 16,
    lineHeight: 19,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  googleButtonText: {
    fontFamily: fonts.heading.bold,
    fontSize: 16,
    lineHeight: 19,
    color: '#000000',
    textAlign: 'center',
  },

  appleConnectedCard: {
    width: 276,
    height: 50,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  connectedCheckCircle: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  connectedCheckText: {
    fontFamily: fonts.heading.bold,
    fontSize: 8,
    lineHeight: 9,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  appleConnectedText: {
    flex: 1,
    fontFamily: fonts.heading.bold,
    fontSize: 13,
    lineHeight: 16,
    color: '#16A34A',
  },

  googleConnectedCard: {
    width: 276,
    height: 50,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  googleConnectedContent: {
    flex: 1,
    justifyContent: 'center',
  },

  googleConnectedEmail: {
    maxWidth: 188,
    fontFamily: fonts.heading.bold,
    fontSize: 14,
    lineHeight: 16,
    color: '#111827',
  },

  googleConnectedBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },

  syncDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#16A34A',
    marginRight: 7,
  },

  syncText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    lineHeight: 15,
    color: '#16A34A',
  },

  trashButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    flexShrink: 0,
  },

  trashIcon: {
    width: 23,
    height: 23,
    tintColor: '#EF4444',
  },

  pressed: {
    opacity: 0.72,
  },

  disabledButton: {
    opacity: 0.5,
  },
});