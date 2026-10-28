import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import Svg, { Path, Rect } from 'react-native-svg';

import {
  fetchAssignmentById,
  type Assignment,
} from '../../../repositories/assignmentsRepository';
import { colors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'AssignmentDetails'
>;

type LoadStatus = 'loading' | 'ready' | 'missing' | 'error';

// The same details screen is opened from Study Plan and List.
export function AssignmentDetailsScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { assignmentId } = route.params;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [reloadCount, setReloadCount] = useState(0);

  // Load the selected assignment again whenever this screen gains focus.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadAssignment() {
        setStatus('loading');
        setAssignment(null);

        try {
          const result = await fetchAssignmentById(assignmentId);

          if (!active) return;

          setAssignment(result);
          setStatus(result ? 'ready' : 'missing');
        } catch {
          if (!active) return;

          setStatus('error');
        }
      }

      void loadAssignment();

      // Ignore results if the student leaves before the request finishes.
      return () => {
        active = false;
      };
    }, [assignmentId, reloadCount]),
  );

  const courseLabel =
    assignment?.courseCode ||
    assignment?.courseName ||
    'No course assigned';

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
      {/* Return to the page that opened these assignment details. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => navigation.goBack()}
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

      {status === 'loading' && (
        <View style={styles.statusContainer}>
          <ActivityIndicator color={colors.deepOlive} />
          <Text
            style={styles.statusText}
            accessibilityLiveRegion="polite"
          >
            Loading assignment…
          </Text>
        </View>
      )}

      {status === 'missing' && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            This assignment is no longer available.
          </Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.statusContainer}>
          <Text accessibilityRole="alert" style={styles.statusText}>
            Couldn’t load this assignment.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => setReloadCount((count) => count + 1)}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {status === 'ready' && assignment && (
        <View style={styles.details}>
          {/* Identify the course using its saved name and color. */}
          <View style={styles.courseRow}>
            <View
              style={[
                styles.courseDot,
                { backgroundColor: assignment.courseColor },
              ]}
              accessible={false}
            />

            <Text style={styles.courseText}>{courseLabel}</Text>
          </View>

          <Text accessibilityRole="header" style={styles.title}>
            {assignment.title}
          </Text>

          {/* Display the real saved due date in the student's local time. */}
          <View style={styles.dueRow}>
            <Svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              accessible={false}
            >
              <Rect
                x={3}
                y={5}
                width={18}
                height={16}
                rx={2}
                stroke={colors.deepOlive}
                strokeWidth={2}
              />
              <Path
                d="M16 3v4M8 3v4M3 11h18"
                stroke={colors.deepOlive}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>

            <Text style={styles.dueText}>
              {assignment.dueAt
                ? `Due ${format(
                    assignment.dueAt,
                    'EEE, MMM d, yyyy • h:mm a',
                  )}`
                : 'No due date'}
            </Text>
          </View>

          {/* Show the full Canvas description without inventing a summary. */}
          <Text style={styles.description}>
            {assignment.description || 'No description provided'}
          </Text>
        </View>
      )}
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
    paddingHorizontal: 26,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mistGreen,
    marginBottom: 16,
  },
  details: {
    gap: 8,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.deepOlive,
  },
  courseText: {
    ...textStyles.caption,
    flex: 1,
    color: colors.mutedGrayGreen,
  },
  title: {
    ...textStyles.screenHeading,
    color: colors.deepOlive,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  dueText: {
    ...textStyles.tinyLabel,
    flex: 1,
    color: colors.deepOlive,
  },
  description: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    lineHeight: 18,
    marginTop: 4,
  },
  statusContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    ...textStyles.body,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.mistGreen,
  },
  retryText: {
    ...textStyles.link,
    color: colors.deepOlive,
  },
  pressed: {
    opacity: 0.7,
  },
});