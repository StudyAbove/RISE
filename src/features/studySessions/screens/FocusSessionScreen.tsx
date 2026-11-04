import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  useIsFocused,
  usePreventRemove,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';
import type { RootStackParamList } from '../../navigation/types';
import { useFocusCountdown } from '../hooks/useFocusCountdown';
import { setMicrotaskCompleted } from '../../../repositories/microtasksRepository';
import {
  TaskCompletionModal,
  type TaskCompletionChoice,
} from '../components/TaskCompletionModal';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'FocusSession'
>;

// Focus-session layout and navigation.
// Each selected task has its own countdown.
export function FocusSessionScreen({ route, navigation }: Props) {
  const { assignmentId, assignmentTitle, microtasks } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();

  // Preserve the selected order and reject invalid or duplicate tasks.
  const sessionTasks = useMemo(() => {
    const seenIds = new Set<string>();

    return (microtasks ?? []).filter((task) => {
      if (
        !task ||
        typeof task.id !== 'string' ||
        task.id.trim() === '' ||
        typeof task.title !== 'string' ||
        task.title.trim() === '' ||
        !Number.isInteger(task.estimatedMinutes) ||
        task.estimatedMinutes <= 0 ||
        task.estimatedMinutes > 6000 ||
        seenIds.has(task.id)
      ) {
        return false;
      }

      seenIds.add(task.id);
      return true;
    });
  }, [microtasks]);

  // Advance only when the student chooses to move to the next task.
  const [taskIndex, setTaskIndex] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [endRequested, setEndRequested] = useState(false);

  const currentTask = sessionTasks[taskIndex];
  const hasNextTask = taskIndex + 1 < sessionTasks.length;

  // Prevent gestures or system Back from leaving during a completion save.
  usePreventRemove(savingCompletion, () => {});

  // Navigate after saving finishes and the navigation lock is released.
  useEffect(() => {
    if (endRequested && !savingCompletion) {
      setEndRequested(false);
      setShowCompletion(false);
      navigation.goBack();
    }
  }, [endRequested, savingCompletion, navigation]);

  const { remainingSeconds, hasEnded } = useFocusCountdown({
    taskId: currentTask?.id ?? '',
    durationSeconds: currentTask ? currentTask.estimatedMinutes * 60 : 0,
    running:
      isFocused &&
      currentTask !== undefined &&
      !showCompletion &&
      !savingCompletion &&
      !endRequested,
  });

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const timerLabel =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${minutes}:${String(seconds).padStart(2, '0')}`;

  // Keep the timer area within the screen on smaller phones.
  const ringSize = Math.max(120, Math.min(width - 64, 280));
  // The assignment-details screen remains directly beneath this screen.
  const returnToAssignment = () => {
    if (!savingCompletion) {
      navigation.goBack();
    }
  };

  function openCompletion() {
    if (!currentTask) {
      returnToAssignment();
      return;
    }

    setShowCompletion(true);
  }

  async function confirmTask(choice: TaskCompletionChoice) {
    if (!currentTask) {
      throw new Error('No task is available.');
    }

    if (choice.completed) {
      setSavingCompletion(true);

      try {
        // Save the current task only, never every task in the queue.
        // Errors propagate to the popup, which stays open for retry.
        await setMicrotaskCompleted(
          assignmentId,
          currentTask.id,
          true,
        );
      } finally {
        setSavingCompletion(false);
      }
    }

    if (choice.action === 'next' && hasNextTask) {
      // Unchecked tasks remain unfinished when the student moves on.
      setTaskIndex((previous) => previous + 1);
      setShowCompletion(false);
    } else {
      setEndRequested(true);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to assignment"
          onPress={returnToAssignment}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            accessible={false}
          >
            <Path
              d="M19 12H5m7-7-7 7 7 7"
              stroke={colors.deepOlive}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        <View style={styles.headingGroup}>
          <Text accessibilityRole="header" style={styles.title}>
            Focus Session
          </Text>

          {/* Keep the selected assignment visible during the session. */}
          <Text style={styles.assignmentTitle}>
            {assignmentTitle}
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {/* Show one task's time rather than combining the whole queue. */}
      <View style={styles.timerContainer}>
        {currentTask && (
          <>
            <Text style={styles.taskNumber}>
              Task {taskIndex + 1} of {sessionTasks.length}
            </Text>

            <Text style={styles.currentTaskTitle}>
              {currentTask.title}
            </Text>
          </>
        )}

        <View
          style={[
            styles.timerRing,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
            },
          ]}
        >
          <Text
            accessibilityLabel={
              currentTask
                ? `Time remaining: ${hours} hours, ${minutes} minutes, ${seconds} seconds`
                : 'No task selected'
            }
            style={[
              styles.timerText,
              { fontSize: Math.min(50, (ringSize - 44) / 6) },
            ]}
          >
            {currentTask ? timerLabel : '—'}
          </Text>
        </View>

        <Text
          style={styles.timerNote}
          accessibilityLiveRegion="polite"
        >
          {!currentTask
            ? 'Return to the assignment and select a task to start.'
            : hasEnded
              ? 'Time is up. This task has not been marked complete.'
              : 'Current task only'}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done studying current task"
          onPress={openCompletion}
          style={({ pressed }) => [
            styles.actionButton,
            styles.doneButton,
            pressed && styles.pressed,
          ]}
        >
          <Svg
            width={21}
            height={21}
            viewBox="0 0 24 24"
            fill="none"
            accessible={false}
          >
            <Circle
              cx={12}
              cy={12}
              r={9}
              stroke={colors.deepOlive}
              strokeWidth={1.5}
            />
            <Path
              d="m7 12 3 3 7-7"
              stroke={colors.deepOlive}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>

          <Text style={styles.doneText}>Done</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take a break"
          onPress={() => navigation.navigate('TakeABreak')}
          style={({ pressed }) => [
            styles.actionButton,
            styles.breakButton,
            pressed && styles.pressed,
          ]}
        >
          <Svg
            width={21}
            height={21}
            viewBox="0 0 24 24"
            fill="none"
            accessible={false}
          >
            <Path
              d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm12 1h2a3 3 0 1 1 0 6h-2M7 3v2m4-2v2"
              stroke={colors.softWhite}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>

          <Text style={styles.breakText}>Break</Text>
        </Pressable>
      </View>

      <TaskCompletionModal
        visible={showCompletion}
        taskTitle={currentTask?.title ?? ''}
        hasNextTask={hasNextTask}
        onConfirm={confirmTask}
        onKeepStudying={() => setShowCompletion(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mistGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingGroup: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 3,
  },
  title: {
    ...textStyles.sectionTitle,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  assignmentTitle: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    textAlign: 'center',
    marginTop: 3,
  },
  headerSpacer: {
    width: 44,
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: 30,
    gap: 12,
  },
  taskNumber: {
    ...textStyles.caption,
    color: colors.eucalyptus,
    textAlign: 'center',
  },
  currentTaskTitle: {
    ...textStyles.sectionTitle,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  timerRing: {
    borderWidth: 22,
    borderColor: colors.eucalyptus,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  timerText: {
    ...textStyles.timer,
    color: colors.eucalyptus,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  timerNote: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    textAlign: 'center',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 28,
    marginTop: 48,
  },
  actionButton: {
    minWidth: 112,
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  doneButton: {
    backgroundColor: colors.mistGreen,
    borderWidth: 1,
    borderColor: colors.softSage,
  },
  breakButton: {
    backgroundColor: colors.eucalyptus,
  },
  doneText: {
    ...textStyles.link,
    color: colors.deepOlive,
  },
  breakText: {
    ...textStyles.link,
    color: colors.softWhite,
  },
  pressed: {
    opacity: 0.7,
  },
});