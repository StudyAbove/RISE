import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import {
  fetchMicrotasks,
  MicrotaskGenerationError,
  requestMicrotaskGeneration,
  setMicrotaskCompleted,
  type Microtask,
} from '../../../repositories/microtasksRepository';
import { colors, statusColors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';
import { formatEstimate } from '../utils/assignmentEstimate';
import {
  getMicrotaskProgress,
  getRemainingWorkLabel,
} from '../utils/assignmentProgress';

type Props = {
  assignment: Assignment;
  onSelectionChange?: (tasks: Microtask[]) => void;
};

type LoadStatus = 'loading' | 'ready' | 'error';

// Display the selected assignment's saved, ordered microtasks.
// Session selection is separate from saved completion.
export function AssignmentMicrotasks({
  assignment,
  onSelectionChange,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Microtask[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState('');
  const completionInProgress = useRef(false);

  // Ignore old requests after this component reloads or unmounts.
  const requestVersion = useRef(0);

  // Prevent repeated taps from starting multiple generation requests.
  const generationInProgress = useRef(false);

  useEffect(() => {
    const version = ++requestVersion.current;

    async function loadTasks() {
      setStatus('loading');
      setTasks([]);
      setNotice('');

      try {
        const savedTasks = await fetchMicrotasks(assignment.id);

        if (requestVersion.current !== version) return;

        setTasks(savedTasks);
        setStatus('ready');

        if (savedTasks.length > 0) {
          try {
            // Existing plans are checked without making a new AI request.
            const result = await requestMicrotaskGeneration(assignment.id);

            if (requestVersion.current !== version) return;

            if (result.status === 'outdated') {
              setNotice(
                'This assignment has changed since these tasks were created. ' +
                'Your saved tasks have been kept.',
              );
            }
          } catch {
            if (requestVersion.current !== version) return;

            // Keep saved work visible even if the freshness check fails.
            setNotice(
              'Your saved tasks are shown. We couldn’t check whether ' +
              'the assignment instructions have changed.',
            );
          }
        }
      } catch {
        if (requestVersion.current !== version) return;

        setStatus('error');
      }
    }

    void loadTasks();

    return () => {
      requestVersion.current += 1;
    };
  }, [assignment.id, assignment.estimatedMinutes, reloadCount]);

  const hasSavedEstimate =
    assignment.estimatedMinutes !== null &&
    Number.isInteger(assignment.estimatedMinutes) &&
    assignment.estimatedMinutes >= 5 &&
    assignment.estimatedMinutes <= 6000;

  // Send only valid, unfinished tasks in their saved display order.
  // Selecting a task never changes its saved completion status.
  useEffect(() => {
    const selectedTasks =
      status === 'ready' && !assignment.completed
        ? tasks.filter(
            (task) =>
              task.assignmentId === assignment.id &&
              selectedIds.includes(task.id) &&
              !task.completed &&
              Number.isInteger(task.estimatedMinutes) &&
              task.estimatedMinutes > 0 &&
              task.estimatedMinutes <= 6000,
          )
        : [];

    onSelectionChange?.(selectedTasks);
  }, [
    assignment.id,
    assignment.completed,
    tasks,
    status,
    selectedIds,
    onSelectionChange,
  ]);

  function toggleSelection(taskId: string) {
    setSelectedIds((previous) =>
      previous.includes(taskId)
        ? previous.filter((id) => id !== taskId)
        : [...previous, taskId],
    );
  }

  // Weighted by each task's time, the same as the assignment's card (#46).
  const progress = getMicrotaskProgress(tasks);
  const { completedCount, percent: progressPercent } = progress;

  async function completeTask(task: Microtask) {
    if (
      completionInProgress.current ||
      task.completed ||
      assignment.completed ||
      task.assignmentId !== assignment.id
    ) {
      return;
    }

    completionInProgress.current = true;
    const version = requestVersion.current;

    setUpdatingTaskId(task.id);
    setCompletionError('');

    try {
      await setMicrotaskCompleted(assignment.id, task.id, true);

      if (requestVersion.current !== version) return;

      setTasks((previous) =>
        previous.map((savedTask) =>
          savedTask.id === task.id
            ? { ...savedTask, completed: true }
            : savedTask,
        ),
      );

      // Once completed, it should no longer be queued for studying.
      setSelectedIds((previous) =>
        previous.filter((id) => id !== task.id),
      );
    } catch {
      if (requestVersion.current !== version) return;

      setCompletionError(
        'Couldn’t mark task complete. Please try again.',
      );
    } finally {
      completionInProgress.current = false;

      if (requestVersion.current === version) {
        setUpdatingTaskId(null);
      }
    }
  }

  async function undoCompletion(task: Microtask) {
    if (
      completionInProgress.current ||
      !task.completed ||
      task.assignmentId !== assignment.id
    ) {
      return;
    }

    completionInProgress.current = true;
    const version = requestVersion.current;

    setUpdatingTaskId(task.id);
    setCompletionError('');

    try {
      await setMicrotaskCompleted(assignment.id, task.id, false);

      if (requestVersion.current !== version) return;

      // Update the card and progress only after the database confirms success.
      setTasks((previous) =>
        previous.map((savedTask) =>
          savedTask.id === task.id
            ? { ...savedTask, completed: false }
            : savedTask,
        ),
      );

      // Undo makes the task available again; it does not select it to study.
      setSelectedIds((previous) =>
        previous.filter((id) => id !== task.id),
      );
    } catch {
      if (requestVersion.current !== version) return;

      setCompletionError(
        'Couldn’t undo completion. Please try again.',
      );
    } finally {
      completionInProgress.current = false;

      if (requestVersion.current === version) {
        setUpdatingTaskId(null);
      }
    }
  }
  async function generateTasks() {
    if (
      generationInProgress.current ||
      !hasSavedEstimate ||
      assignment.completed
    ) {
      return;
    }

    generationInProgress.current = true;
    const version = requestVersion.current;

    setGenerating(true);
    setNotice('');

    try {
      const result = await requestMicrotaskGeneration(assignment.id);

      if (requestVersion.current !== version) return;

      if (result.status === 'insufficient_information') {
        setNotice(
          'There isn’t enough assignment information to create useful steps yet.',
        );
        return;
      }

      // Read back the saved records so their stable IDs come from Supabase.
      const savedTasks = await fetchMicrotasks(assignment.id);

      if (requestVersion.current !== version) return;

      if (savedTasks.length === 0) {
        throw new Error('No saved tasks were returned.');
      }

      setTasks(savedTasks);

      if (result.status === 'outdated') {
        setNotice(
          'This assignment has changed since these tasks were created. ' +
          'Your saved tasks have been kept.',
        );
      }
    } catch (error) {
      if (requestVersion.current !== version) return;

      if (
        error instanceof MicrotaskGenerationError &&
        error.code === 'estimate_required'
      ) {
        setNotice(
          'A saved assignment time estimate is needed before creating microtasks.',
        );
      } else if (
        error instanceof MicrotaskGenerationError &&
        ['ai_unavailable', 'not_configured'].includes(error.code)
      ) {
        setNotice(
          'Microtask generation is currently unavailable. Please try again later.',
        );
      } else {
        setNotice('Couldn’t create microtasks. Please try again.');
      }
    } finally {
      generationInProgress.current = false;

      if (requestVersion.current === version) {
        setGenerating(false);
      }
    }
  }

  return (
    <View style={styles.section}>
      {status === 'ready' && tasks.length > 0 && (
        <>
          <Text accessibilityRole="header" style={styles.heading}>
            Progress
          </Text>

          {/* Progress reflects saved completion, not session selection. */}
          <View style={styles.progressGroup}>
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Microtask completion"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: progressPercent,
                text: `${progressPercent}% done, ${completedCount} of ${tasks.length} tasks completed`,
              }}
              style={styles.progressRow}
            >
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>

              <Text style={styles.progressText}>
                {completedCount} / {tasks.length} tasks
              </Text>
            </View>

            {/* What's still left to do (#46). Hidden once the whole
                assignment is marked complete. */}
            {!assignment.completed && (
              <Text style={styles.remainingText}>
                {getRemainingWorkLabel(progress)}
              </Text>
            )}
          </View>
        </>
      )}

      <Text accessibilityRole="header" style={styles.heading}>
        Tasks
      </Text>

      {status === 'loading' && (
        <View style={styles.messageCard}>
          <ActivityIndicator color={colors.deepOlive} />
          <Text
            style={styles.messageText}
            accessibilityLiveRegion="polite"
          >
            Loading microtasks…
          </Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.messageCard}>
          <Text accessibilityRole="alert" style={styles.messageText}>
            Couldn’t load microtasks.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => setReloadCount((count) => count + 1)}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {notice !== '' && (
        <Text
          style={styles.notice}
          accessibilityLiveRegion="polite"
        >
          {notice}
        </Text>
      )}
      {completionError !== '' && (
        <Text accessibilityRole="alert" style={styles.notice}>
          {completionError}
        </Text>
      )}

        {status === 'ready' && tasks.length === 0 && (
          <View style={styles.messageCard}>
          <Text style={styles.messageText}>
            No microtasks available yet.
          </Text>

          {!hasSavedEstimate && !assignment.completed && (
            <Text style={styles.messageText}>
              A saved assignment time estimate is needed before creating
              microtasks.
            </Text>
          )}

          {hasSavedEstimate && !assignment.completed && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: generating,
                busy: generating,
              }}
              disabled={generating}
              onPress={() => void generateTasks()}
              style={({ pressed }) => [
                styles.secondaryButton,
                generating && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {generating && (
                <ActivityIndicator color={colors.deepOlive} />
              )}

              <Text style={styles.buttonText}>
                {generating ? 'Creating microtasks…' : 'Create microtasks'}
              </Text>
            </Pressable>
          )}
        </View>
      )}
      {status === 'ready' && tasks.length > 0 && (
        <View style={styles.taskList}>
          {!assignment.completed && (
            <Text style={styles.messageText}>
              Select the tasks you want to study. You’ll work on one at a time.
            </Text>
          )}

          {tasks.map((task) => {
              const canSelect =
                !assignment.completed &&
                !task.completed &&
                Number.isInteger(task.estimatedMinutes) &&
                task.estimatedMinutes > 0 &&
                task.estimatedMinutes <= 6000;

              const selected =
                canSelect && selectedIds.includes(task.id);

              const isUpdating = updatingTaskId === task.id;

              return (
                <View
                  key={task.id}
                  style={[
                    styles.taskCard,
                    selected && styles.selectedCard,
                    task.completed && styles.completedCard,
                  ]}
                >
                  {/* Circle controls completion only. */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      task.completed
                        ? `Mark Step ${task.position} incomplete`
                        : `Mark Step ${task.position} complete`
                    }
                    accessibilityHint={
                      task.completed
                        ? 'Marks this task incomplete again'
                        : 'Marks this task complete'
                    }
                    accessibilityState={{
                      disabled:
                        updatingTaskId !== null ||
                        assignment.completed,
                      busy: isUpdating,
                    }}
                    disabled={
                      updatingTaskId !== null ||
                      assignment.completed
                    }
                    hitSlop={8}
                    onPress={() => {
                      if (task.completed) {
                        void undoCompletion(task);
                      } else {
                        void completeTask(task);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.taskCircleButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.taskCircle,
                        task.completed &&
                          styles.completedCircle,
                      ]}
                    >
                      {task.completed && (
                        <Svg
                          width={15}
                          height={15}
                          viewBox="0 0 24 24"
                          fill="none"
                          accessible={false}
                        >
                          <Path
                            d="m5 12 4 4L19 6"
                            stroke={colors.softWhite}
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      )}
                    </View>
                  </Pressable>

                  {/* Rest of card selects the task for studying. */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      `Step ${task.position}. ${task.title}. ` +
                      `Estimated ${task.estimatedMinutes} minutes. ` +
                      (task.completed
                        ? 'Completed.'
                        : 'Not completed.')
                    }
                    accessibilityHint={
                      canSelect
                        ? 'Selects or deselects this task for a study session'
                        : undefined
                    }
                    accessibilityState={{
                      selected,
                      disabled:
                        updatingTaskId !== null || !canSelect,
                      busy: isUpdating,
                    }}
                    disabled={
                      updatingTaskId !== null || !canSelect
                    }
                    onPress={() => toggleSelection(task.id)}
                    style={({ pressed }) => [
                      styles.taskSelectionArea,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.taskText}>
                      <Text
                        style={[
                          styles.taskTitle,
                          task.completed &&
                            styles.completedTitle,
                        ]}
                      >
                        {task.title}
                      </Text>

                      <Text style={styles.taskTime}>
                        Est. {formatEstimate(
                          task.estimatedMinutes,
                        )}
                        {isUpdating
                          ? ' · Saving…'
                          : task.completed
                            ? ' · Tap circle to undo completion'
                            : selected
                              ? ' · Selected'
                              : ''}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              );
            })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 14,
    gap: 12,
  },
  heading: {
    ...textStyles.sectionTitle,
    color: colors.deepOlive,
  },
  progressGroup: {
    gap: 6,
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 10,
    borderRadius: 10,
    backgroundColor: statusColors.progressTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: colors.softSage,
  },
  progressText: {
    ...textStyles.caption,
    color: colors.deepOlive,
  },
  remainingText: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
  },
  taskList: {
    gap: 10,
  },
  taskCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.mistGreen,
    backgroundColor: colors.softWhite,
  },
  selectedCard: {
    borderColor: colors.butterYellow,
    borderWidth: 2,
    backgroundColor: colors.paleSun,
  },
  completedCard: {
    borderColor: colors.softSage,
    backgroundColor: colors.mistGreen,
  },
  taskCircleButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  taskCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.mutedGrayGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedCircle: {
    backgroundColor: colors.eucalyptus,
    borderColor: colors.eucalyptus,
  },
  taskSelectionArea: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },

  taskText: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    ...textStyles.cardTitle,
    color: colors.deepOlive,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: colors.mutedGrayGreen,
  },
  taskTime: {
    ...textStyles.tinyLabel,
    color: colors.mutedGrayGreen,
    marginTop: 3,
  },
  messageCard: {
    padding: 16,
    gap: 12,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.mistGreen,
    backgroundColor: colors.softWhite,
  },
  messageText: {
    ...textStyles.caption,
    lineHeight: 18,
    color: colors.mutedGrayGreen,
  },
  notice: {
    ...textStyles.caption,
    lineHeight: 18,
    color: colors.deepOlive,
  },
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.mistGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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