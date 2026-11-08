import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useIsFocused,
  usePreventRemove,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import DoneIcon from '../../../../assets/icons/focus-session-done.svg';
import BreakIcon from '../../../../assets/icons/focus-session-break.svg';

import { BackButton } from '../../../components/BackButton';
import { colors } from '../../../theme/colors';
import { fonts, textStyles } from '../../../theme/typography';
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

  // A cycle is either the task's original estimate or one extension.
  // Extensions are always based on the task's ORIGINAL estimate.
  const [countdownDurationSeconds, setCountdownDurationSeconds] =
    useState(() =>
      sessionTasks[0]
        ? sessionTasks[0].estimatedMinutes * 60
        : 0,
    );

  // Give every countdown cycle a unique identity so repeated extensions
  // of the same length still reset the countdown.
  const [countdownCycle, setCountdownCycle] = useState(0);

  // Track actual focused time across every task and extension.
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);
  const accumulatedSessionMsRef = useRef(0);
  const activeSessionStartedAtRef = useRef<number | null>(null);

  // Prevent the timeout popup from immediately reopening during the
  // render where an extension is being installed.
  const extendingTimeRef = useRef(false);

  const [showCompletion, setShowCompletion] = useState(false);
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [endRequested, setEndRequested] = useState(false);
  const [
    isBackConfirmationVisible,
    setIsBackConfirmationVisible,
  ] = useState(false);

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
    taskId: currentTask
      ? `${currentTask.id}:${countdownCycle}`
      : '',
    durationSeconds: currentTask
      ? countdownDurationSeconds
      : 0,
    running:
      isFocused &&
      currentTask !== undefined &&
      !showCompletion &&
      !savingCompletion &&
      !endRequested &&
      !isBackConfirmationVisible,
  });

  const elapsedProgress =
    countdownDurationSeconds > 0
      ? Math.min(
          1,
          Math.max(
            0,
            (countdownDurationSeconds - remainingSeconds) /
              countdownDurationSeconds,
          ),
        )
      : 0;

  const shouldCountSessionTime =
    isFocused &&
    currentTask !== undefined &&
    remainingSeconds > 0 &&
    !showCompletion &&
    !savingCompletion &&
    !endRequested &&
    !isBackConfirmationVisible;

  // Count real elapsed focus time rather than planned task duration.
  useEffect(() => {
    if (!shouldCountSessionTime) {
      return;
    }

    const startedAt = Date.now();
    activeSessionStartedAtRef.current = startedAt;

    const updateSessionElapsed = () => {
      const activeMs = Date.now() - startedAt;
      setSessionElapsedSeconds(
        Math.floor(
          (accumulatedSessionMsRef.current + activeMs) / 1000,
        ),
      );
    };

    const interval = setInterval(updateSessionElapsed, 250);

    return () => {
      clearInterval(interval);

      const activeMs = Math.max(0, Date.now() - startedAt);
      accumulatedSessionMsRef.current += activeMs;
      activeSessionStartedAtRef.current = null;

      setSessionElapsedSeconds(
        Math.floor(accumulatedSessionMsRef.current / 1000),
      );
    };
  }, [shouldCountSessionTime]);

  // Once a cycle reaches zero, ask the student what to do.
  // Time expiring never completes the task automatically.
  useEffect(() => {
    if (extendingTimeRef.current) {
      if (!hasEnded) {
        extendingTimeRef.current = false;
      }
      return;
    }

    if (
      hasEnded &&
      currentTask &&
      !showCompletion &&
      !savingCompletion &&
      !endRequested &&
      !isBackConfirmationVisible
    ) {
      setShowCompletion(true);
    }
  }, [
    hasEnded,
    currentTask,
    showCompletion,
    savingCompletion,
    endRequested,
    isBackConfirmationVisible,
  ]);

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const timerLabel =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${minutes}:${String(seconds).padStart(2, '0')}`;

  const sessionHours = Math.floor(sessionElapsedSeconds / 3600);
  const sessionMinutes = Math.floor(
    (sessionElapsedSeconds % 3600) / 60,
  );
  const sessionSeconds = sessionElapsedSeconds % 60;

  const sessionTimeLabel =
    sessionHours > 0
      ? `${sessionHours}:${String(sessionMinutes).padStart(2, '0')}:${String(sessionSeconds).padStart(2, '0')}`
      : `${sessionMinutes}:${String(sessionSeconds).padStart(2, '0')}`;

  // Keep the timer area within the screen on smaller phones.
  const ringSize = Math.max(120, Math.min(width - 64, 280));
  // The assignment-details screen remains directly beneath this screen.
  const returnToAssignment = () => {
    if (!savingCompletion) {
      navigation.goBack();
    }
  };

  function handleCancelBack() {
    setIsBackConfirmationVisible(false);
  }

  function handleConfirmBack() {
    setIsBackConfirmationVisible(false);
    returnToAssignment();
  }

  function handleNeedMoreTime() {
    if (!currentTask) {
      setShowCompletion(false);
      return;
    }

    if (hasEnded) {
      const originalTaskSeconds =
        currentTask.estimatedMinutes * 60;

      const extensionSeconds = Math.max(
        1,
        Math.round(originalTaskSeconds / 2),
      );

      extendingTimeRef.current = true;
      setCountdownDurationSeconds(extensionSeconds);
      setCountdownCycle((previous) => previous + 1);
    }

    setShowCompletion(false);
  }

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
      const nextTask = sessionTasks[taskIndex + 1];

      if (nextTask) {
        setCountdownDurationSeconds(
          nextTask.estimatedMinutes * 60,
        );
        setCountdownCycle((previous) => previous + 1);
      }

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
        <BackButton
          onPress={() =>
            setIsBackConfirmationVisible(true)
          }
        />

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
          {(() => {
            const strokeWidth = 22;
            const center = ringSize / 2;
            const radius = (ringSize - strokeWidth) / 2;
            const circumference = 2 * Math.PI * radius;
            const dashOffset =
              circumference * (1 - elapsedProgress);

            return (
              <Svg
                width={ringSize}
                height={ringSize}
                style={styles.timerProgressSvg}
                accessible={false}
              >
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={colors.mistGreen}
                  strokeWidth={strokeWidth}
                />

                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={colors.eucalyptus}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  rotation="-90"
                  origin={`${center}, ${center}`}
                />
              </Svg>
            );
          })()}

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
          {`Total study time: ${sessionTimeLabel}`}
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
          <DoneIcon accessible={false} />
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
          <BreakIcon accessible={false} />
          <Text style={styles.breakText}>Break</Text>
        </Pressable>
      </View>

      <TaskCompletionModal
        visible={showCompletion}
        taskTitle={currentTask?.title ?? ''}
        hasNextTask={hasNextTask}
        timeExpired={hasEnded}
        onConfirm={confirmTask}
        onNeedMoreTime={handleNeedMoreTime}
      />

      <Modal
        visible={isBackConfirmationVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelBack}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.infoIconOuter}>
              <View style={styles.infoIconInner}>
                <Text style={styles.infoIconText}>i</Text>
              </View>
            </View>

            <Text style={styles.modalTitle}>
              Are you sure you want to go Back?
            </Text>

            <Text style={styles.modalMessage}>
              If you choose to go back, any unsaved progress from this study
              session will be lost.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel going back"
                onPress={handleCancelBack}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.cancelButton,
                  pressed && styles.modalButtonPressed,
                ]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm going back"
                onPress={handleConfirmBack}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.confirmButton,
                  pressed && styles.modalButtonPressed,
                ]}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  headingGroup: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 3,
  },
  title: {
    ...textStyles.screenHeading,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0.1,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  assignmentTitle: {
    ...textStyles.caption,
    fontSize: 13,
    lineHeight: 17,
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
    fontSize: 12,
    lineHeight: 16,
    color: colors.eucalyptus,
    textAlign: 'center',
  },
  currentTaskTitle: {
    fontFamily: fonts.body.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  timerRing: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    position: 'relative',
  },

  timerProgressSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
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
    gap: 36,
    marginTop: 48,
  },
  actionButton: {
    width: 122,
    height: 54,
    paddingHorizontal: 20,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: colors.mutedGrayGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  doneButton: {
    backgroundColor: colors.mistGreen,
  },
  breakButton: {
    backgroundColor: colors.eucalyptus,
  },
  doneText: {
    fontFamily: fonts.heading.bold,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0.75,
    color: colors.deepOlive,
  },
  breakText: {
    fontFamily: fonts.heading.bold,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0.75,
    color: colors.warmCream,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCard: {
    width: 324,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
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

  infoIconOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoIconInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoIconText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    color: '#38BDF8',
    textAlign: 'center',
  },

  modalTitle: {
    marginTop: 12,
    ...textStyles.screenHeading,
    fontSize: 20,
    lineHeight: 27,
    color: '#000000',
    textAlign: 'center',
  },

  modalMessage: {
    width: 276,
    marginTop: 16,
    fontSize: 14,
    lineHeight: 18,
    color: '#71717B',
    textAlign: 'center',
  },

  modalActions: {
    width: 276,
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },

  modalButton: {
    width: 134,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButton: {
    backgroundColor: '#000000',
  },

  confirmButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
  },

  cancelButtonText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  confirmButtonText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
    color: '#000000',
  },

  modalButtonPressed: {
    opacity: 0.72,
  },

  pressed: {
    opacity: 0.7,
  },
});