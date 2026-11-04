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
  onConfirm: (choice: TaskCompletionChoice) => Promise<void>;
  onKeepStudying: () => void;
};

/**
 * Finishing a study session does not automatically finish its task.
 * Completion starts unchecked and must be explicitly confirmed.
 */
export function TaskCompletionModal({
  visible,
  taskTitle,
  hasNextTask,
  onConfirm,
  onKeepStudying,
}: Props) {
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Block repeated taps before React updates the disabled controls.
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
      // Preserve the student's choice so the same operation can be retried.
      setError('Couldn’t save task completion. Please try again.');
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  function keepStudying() {
    if (!submittingRef.current) {
      onKeepStudying();
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={keepStudying}
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
            <Text accessibilityRole="header" style={styles.title}>
              Did you finish this task?
            </Text>

            <Text style={styles.taskTitle}>{taskTitle}</Text>

            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="Yes, mark this task complete"
              accessibilityState={{
                checked: completed,
                disabled: saving,
              }}
              disabled={saving}
              onPress={() => setCompleted((previous) => !previous)}
              style={({ pressed }) => [
                styles.choice,
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
                {completed && <Text style={styles.checkmark}>✓</Text>}
              </View>

              <Text style={styles.choiceText}>
                Yes, mark this task complete
              </Text>
            </Pressable>

            <Text style={styles.note}>
              Leave unchecked if you need more time. Moving on won’t
              mark an unfinished task complete.
            </Text>

            {error !== '' && (
              <Text accessibilityRole="alert" style={styles.error}>
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

            {hasNextTask && (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: saving, busy: saving }}
                disabled={saving}
                onPress={() => void submit('next')}
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryButton,
                  saving && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.buttonText}>
                  Continue to next task
                </Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: saving, busy: saving }}
              disabled={saving}
              onPress={() => void submit('end')}
              style={({ pressed }) => [
                styles.button,
                hasNextTask
                  ? styles.secondaryButton
                  : styles.primaryButton,
                saving && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.buttonText}>End study session</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={keepStudying}
              style={({ pressed }) => [
                styles.linkButton,
                saving && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.linkText}>
                Keep studying this task
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
    backgroundColor: 'rgba(53, 67, 58, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '100%',
    borderRadius: 20,
    backgroundColor: colors.warmCream,
  },
  content: {
    padding: 24,
    gap: 12,
  },
  title: {
    ...textStyles.sectionTitle,
    color: colors.deepOlive,
  },
  taskTitle: {
    ...textStyles.body,
    color: colors.deepOlive,
    lineHeight: 21,
  },
  choice: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  },
  checkmark: {
    color: colors.softWhite,
    fontSize: 17,
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
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.softSage,
    backgroundColor: colors.mistGreen,
  },
  buttonText: {
    ...textStyles.link,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  linkButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    ...textStyles.link,
    color: colors.eucalyptus,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.7,
  },
});