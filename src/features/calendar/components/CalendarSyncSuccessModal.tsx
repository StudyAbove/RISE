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

const successCheckIcon =
  require('../../../../assets/icons/success-check.png');

type CalendarSyncSuccessModalProps = {
  visible: boolean;
  provider: 'Apple' | 'Google';
  onDone: () => void;
};

export function CalendarSyncSuccessModal({
  visible,
  provider,
  onDone,
}: CalendarSyncSuccessModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDone}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.successIconOuter}>
            <View style={styles.successIconInner}>
              <Image
                source={successCheckIcon}
                style={styles.successCheckIcon}
                resizeMode="contain"
              />
            </View>
          </View>

          <Text style={styles.modalTitle}>
            Calendar synced!
          </Text>

          <Text style={styles.modalMessage}>
            Your {provider} Calendar is now connected. We’ll use your
            schedule to help plan study sessions around your existing
            events.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.doneButton,
              pressed && styles.pressed,
            ]}
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.doneButtonText}>
              Done
            </Text>
          </Pressable>
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

  successIconOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successIconInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successCheckIcon: {
    width: 22,
    height: 22,
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
    marginTop: 12,
    fontFamily: fonts.body.medium,
    fontSize: 14,
    lineHeight: 18,
    color: '#71717B',
    textAlign: 'center',
  },

  doneButton: {
    width: 276,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },

  doneButtonText: {
    fontFamily: fonts.heading.bold,
    fontSize: 15,
    lineHeight: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.72,
  },
});