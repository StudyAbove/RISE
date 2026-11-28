import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import type { Microtask } from '../../../repositories/microtasksRepository';
import { colors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';
import { AssignmentMicrotasks } from './AssignmentMicrotasks';

type Props = {
  assignment: Assignment;
  onClose: () => void;
  onStart: (tasks: Microtask[]) => void;
};

export function StudyTaskSelectionModal({
  assignment,
  onClose,
  onStart,
}: Props) {
  const [selectedTasks, setSelectedTasks] = useState<Microtask[]>([]);
  const startingRef = useRef(false);

  const canStart = !assignment.completed && selectedTasks.length > 0;

  function startSession() {
    if (!canStart || startingRef.current) return;

    const validTasks = selectedTasks.filter(
      (task) =>
        task.assignmentId === assignment.id &&
        !task.completed &&
        Number.isInteger(task.estimatedMinutes) &&
        task.estimatedMinutes > 0 &&
        task.estimatedMinutes <= 6000,
    );

    if (validTasks.length === 0) return;

    startingRef.current = true;
    onStart(validTasks);
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={styles.title}>
            Choose tasks to study
          </Text>

          <Text style={styles.assignmentTitle}>
            {assignment.title}
          </Text>

          <Text style={styles.hint}>
            {assignment.completed
              ? 'This assignment is already complete.'
              : 'Choose one or more tasks. Selecting does not mark them complete.'}
          </Text>

          <ScrollView
            style={styles.taskScroll}
            contentContainerStyle={styles.taskContent}
          >
            <AssignmentMicrotasks
              assignment={assignment}
              selectionOnly
              onSelectionChange={setSelectedTasks}
            />
          </ScrollView>

          <Text style={styles.hint} accessibilityLiveRegion="polite">
            {selectedTasks.length === 0
              ? 'Select at least one task to start.'
              : `${selectedTasks.length} selected · One task at a time`}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Start selected tasks for ${assignment.title}`}
            accessibilityState={{ disabled: !canStart }}
            disabled={!canStart}
            onPress={startSession}
            style={({ pressed }) => [
              styles.button,
              styles.startButton,
              !canStart && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>Start studying</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close task selection"
            onPress={onClose}
            style={({ pressed }) => [
              styles.button,
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>View assignment details</Text>
          </Pressable>
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
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    flexShrink: 1,
    borderRadius: 16,
    backgroundColor: colors.warmCream,
    padding: 20,
    gap: 12,
  },
  title: {
    ...textStyles.sectionTitle,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  assignmentTitle: {
    ...textStyles.cardTitle,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  hint: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    textAlign: 'center',
  },
  taskScroll: {
    flexShrink: 1,
  },
  taskContent: {
    paddingBottom: 8,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: colors.butterYellow,
  },
  closeButton: {
    backgroundColor: colors.mistGreen,
  },
  buttonText: {
    ...textStyles.link,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.7,
  },
});