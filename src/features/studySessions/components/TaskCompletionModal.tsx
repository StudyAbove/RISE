import { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Svg, { Path } from 'react-native-svg';

import { colors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';

export type TaskCompletionChoice = {
  completed: boolean;
  action: 'next' | 'end';
};

type Props = {
  visible: boolean;
  taskTitle: string;
  hasNextTask: boolean;
  timeExpired?: boolean;
  onConfirm: (choice: TaskCompletionChoice) => Promise<void>;
  onNeedMoreTime: () => void;
};

/**
 * Finishing a study task does not automatically complete it.
 * Completion starts unchecked and must be explicitly confirmed.
 */
export function TaskCompletionModal({
  visible,
  taskTitle,
  hasNextTask,
  timeExpired = false,
  onConfirm,
  onNeedMoreTime,
}: Props) {
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Prevent repeated submissions before React updates disabled controls.
  const submittingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setCompleted(false);
      setError('');
    }
  }, [visible, taskTitle]);

  async function submit(action: TaskCompletionChoice['action']) {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSaving(true);
    setError('');

    try {
      // The parent saves confirmed completion before moving or leaving.
      await onConfirm({ completed, action });
    } catch {
      // Keep the student's choice checked so the save can be retried.
      setError('Couldn’t save task completion. Please try again.');
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  function needMoreTime() {
    if (!submittingRef.current) {
      onNeedMoreTime();
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={needMoreTime}
    >
      <View style={styles.overlay}>
        <View
          style={styles.card}
          accessibilityViewIsModal
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text
              accessibilityRole="header"
              style={styles.title}
            >
              Did you finish this task?
            </Text>

            <Text style={styles.taskTitle}>
              {taskTitle}
            </Text>

            <View style={styles.choice}>
              {/* Only the circle changes completion. */}
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="Yes, mark this task complete"
                accessibilityState={{
                  checked: completed,
                  disabled: saving,
                }}
                disabled={saving}
                hitSlop={8}
                onPress={() =>
                  setCompleted((previous) => !previous)
                }
                style={({ pressed }) => [
                  styles.checkboxButton,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    completed && styles.checked,
                  ]}
                  accessible={false}
                >
                  {completed && (
                    <Svg
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill="none"
                      accessible={false}
                    >
                      <Path
                        d="M5 12.5L9.5 17L19 7"
                        stroke={colors.softWhite}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  )}
                </View>
              </Pressable>

              <Text style={styles.choiceText}>
                Yes, mark this task complete
              </Text>
            </View>

            <Text style={styles.note}>
              Leave unchecked if you need more time. Moving on won’t
              mark an unfinished task complete.
            </Text>

            {error !== '' && (
              <Text
                accessibilityRole="alert"
                style={styles.error}
              >
                {error}
              </Text>
            )}

            {saving && (
              <View style={styles.savingRow}>
                <ActivityIndicator color={colors.deepOlive} />

                <Text
                  style={styles.note}
                  accessibilityLiveRegion="polite"
                >
                  Saving…
                </Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: saving,
                busy: saving,
              }}
              disabled={saving}
              onPress={() =>
                void submit(hasNextTask ? 'next' : 'end')
              }
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                saving && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {hasNextTask
                  ? 'Continue To Next Task'
                  : 'Finish Study Session'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: saving,
              }}
              disabled={saving}
              onPress={needMoreTime}
              style={({ pressed }) => [
                styles.button,
                styles.keepStudyingButton,
                saving && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.keepStudyingButtonText}>
                {timeExpired ? 'I Need More Time' : 'Keep Studying'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },

  card: {
    width: '100%',
    maxWidth: 324,
    maxHeight: '100%',
    borderRadius: 16,
    backgroundColor: colors.softWhite,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },

  content: {
    padding: 24,
    gap: 16,
  },

  title: {
    ...textStyles.screenHeading,
    fontSize: 20,
    lineHeight: 27,
    color: colors.deepOlive,
  },

  taskTitle: {
    ...textStyles.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.deepOlive,
  },

  choice: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  checkboxButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.eucalyptus,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checked: {
    backgroundColor: colors.eucalyptus,
    borderColor: colors.eucalyptus,
  },

  choiceText: {
    ...textStyles.body,
    color: colors.deepOlive,
    flex: 1,
  },

  note: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    lineHeight: 18,
  },

  error: {
    ...textStyles.caption,
    color: colors.deepOlive,
    lineHeight: 18,
  },

  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  button: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButton: {
    backgroundColor: colors.butterYellow,
  },

  primaryButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 18,
    color: colors.deepOlive,
    textAlign: 'center',
  },

  keepStudyingButton: {
    backgroundColor: '#000000',
  },

  keepStudyingButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  disabled: {
    opacity: 0.6,
  },

  pressed: {
    opacity: 0.7,
  },
});
