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
  type Microtask,
} from '../../../repositories/microtasksRepository';
import { colors, statusColors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';
import { formatEstimate } from '../utils/assignmentEstimate';

type Props = {
  assignment: Assignment;
};

type LoadStatus = 'loading' | 'ready' | 'error';

// Display the selected assignment's saved, ordered microtasks.
// Completion controls and session selection are handled by later stories.
export function AssignmentMicrotasks({ assignment }: Props) {
  const [tasks, setTasks] = useState<Microtask[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

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

  const completedCount = tasks.filter((task) => task.completed).length;
  const progressPercent =
    tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

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
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Microtask completion"
            accessibilityValue={{
              min: 0,
              max: tasks.length,
              now: completedCount,
              text: `${completedCount} of ${tasks.length} tasks completed`,
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

      {status === 'ready' && (
        <View style={styles.taskList}>
          {tasks.map((task) => (
            <View
              key={task.id}
              accessible
              accessibilityLabel={
                `Step ${task.position}. ${task.title}. ` +
                `Estimated ${task.estimatedMinutes} minutes. ` +
                (task.completed ? 'Completed.' : 'Not completed.')
              }
              style={[
                styles.taskCard,
                task.completed && styles.completedCard,
              ]}
            >
              <View
                style={[
                  styles.taskCircle,
                  task.completed && styles.completedCircle,
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

              <View style={styles.taskText}>
                <Text
                  style={[
                    styles.taskTitle,
                    task.completed && styles.completedTitle,
                  ]}
                >
                  {task.title}
                </Text>

                <Text style={styles.taskTime}>
                  Est. {formatEstimate(task.estimatedMinutes)}
                </Text>
              </View>
            </View>
          ))}
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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
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
  completedCard: {
    borderColor: colors.softSage,
    backgroundColor: colors.mistGreen,
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