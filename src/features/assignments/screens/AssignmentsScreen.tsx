import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { format, isSameYear } from 'date-fns';
import { isAssignmentUrgent } from '../utils/isAssignmentUrgent';
import Svg, { Path, Rect } from 'react-native-svg';

import { TabScreenScrollView } from '../../../components/TabScreenScrollView';
import { useCurrentDate } from '../../../hooks/useCurrentDate';
import { supabase } from '../../../lib/supabase';
import {
  fetchAssignments,
  type Assignment,
} from '../../../repositories/assignmentsRepository';
import { colors, statusColors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';
import { HomeSkyBackdrop } from '../../home/components/HomeSkyBackdrop';
import { getTimeOfDay } from '../../home/utils/greeting';
import { SettingsButton } from '../../settings/components/SettingsButton';

type LoadStatus = 'loading' | 'ready' | 'signedOut' | 'error';

// Let the hills extend slightly below the subtitle.
const SKY_OVERLAP_BELOW_HEADER = 8;

// Draw the small calendar icon next to each due date.
function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg
      width={14}
      height={14}
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
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="M16 3v4M8 3v4M3 11h18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Build one card using a real assignment from Supabase.
function AssignmentCard({
  assignment,
  today,
}: {
  assignment: Assignment;
  today: Date;
}) {
  // This is assignment completion, not microtask progress.
  const completionPercent = assignment.completed ? 100 : 0;

  // Highlight incomplete assignments due within 24 hours or already overdue.
  const needsAttention = isAssignmentUrgent(
    assignment.dueAt,
    assignment.completed,
    today,
  );

  const dueColor = needsAttention
    ? statusColors.urgentRed
    : colors.deepOlive;

  // Include the year when an assignment belongs to a different year.
  const dueLabel = assignment.dueAt
    ? `Due ${format(
        assignment.dueAt,
        isSameYear(assignment.dueAt, today)
          ? 'EEE, MMM d'
          : 'EEE, MMM d, yyyy',
      )}`
    : 'No due date';

  const courseLabel =
    assignment.courseCode ||
    assignment.courseName ||
    'No course assigned';

  // The extension already converts Canvas descriptions to plain text.
  const description =
    assignment.description?.replace(/\s+/g, ' ').trim() ||
    'No description provided';

  return (
    <View style={styles.card}>
      {/* Use the student's saved course color. */}
      <View
        accessible
        accessibilityLabel={`Course: ${courseLabel}`}
        style={[
          styles.courseDot,
          { backgroundColor: assignment.courseColor },
        ]}
      />

      <View style={styles.cardContent}>
        <Text style={styles.assignmentTitle}>
          {assignment.title}
        </Text>

        {/* Shorten only what is visible, without rewriting the instructions. */}
        <Text
          style={styles.description}
          numberOfLines={1}
          ellipsizeMode="tail"
          accessibilityLabel={description}
        >
          {description}
        </Text>

        <View style={styles.dueRow}>
          <CalendarIcon color={dueColor} />
          <Text
            style={[styles.dueDate, { color: dueColor }]}
            accessibilityLabel={
              assignment.dueAt
                ? `Due ${format(
                    assignment.dueAt,
                    'EEEE, MMMM d, yyyy, h:mm a',
                  )}`
                : 'No due date'
            }
          >
            {dueLabel}
          </Text>
        </View>

        {/* Until microtasks are available, completion is 0% or 100%. */}
        <View
          style={styles.progressRow}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${assignment.title} completion`}
          accessibilityValue={{
            min: 0,
            max: 100,
            now: completionPercent,
            text: assignment.completed ? 'Completed' : 'Not completed',
          }}
        >
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${completionPercent}%` },
              ]}
            />
          </View>

          <Text style={styles.progressText}>
            {completionPercent}%
          </Text>
        </View>
      </View>

      {/* Display only. Opening assignment details comes in another story. */}
      <View
        style={styles.playCircle}
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width={14} height={14} viewBox="0 0 14 14">
          <Path d="M4 2v10l8-5z" fill={colors.deepOlive} />
        </Svg>
      </View>
    </View>
  );
}

export function AssignmentsScreen() {
  const titleRef = useRef<Text>(null);
  const date = useCurrentDate();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [reloadCount, setReloadCount] = useState(0);
  const [headerBottom, setHeaderBottom] = useState<number | null>(null);

  // Reload when the student opens this tab or requests a refresh.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadAssignments() {
        setStatus('loading');
        setAssignments([]);

        try {
          const { data, error } = await supabase.auth.getSession();

          if (!active) return;
          if (error) throw error;

          // Skipping the login screen does not create a real session.
          if (!data.session) {
            setStatus('signedOut');
            return;
          }

          const loadedAssignments = await fetchAssignments();

          if (!active) return;

          setAssignments(loadedAssignments);
          setStatus('ready');
        } catch {
          if (!active) return;

          setAssignments([]);
          setStatus('error');
        }
      }

      void loadAssignments();

      // Ignore a request's result if the student leaves this screen.
      return () => {
        active = false;
      };
    }, [reloadCount]),
  );

  const handleHeaderLayout = ({
    nativeEvent: { layout },
  }: LayoutChangeEvent) => {
    setHeaderBottom(layout.y + layout.height);
  };

  const refreshAssignments = () => {
    setReloadCount((count) => count + 1);
  };

  return (
    <TabScreenScrollView
      focusTargetRef={titleRef}
      contentContainerStyle={styles.container}
    >
      {/* Draw the artwork behind the header. */}
      {headerBottom !== null && (
        <HomeSkyBackdrop
          timeOfDay={getTimeOfDay(date)}
          bottom={headerBottom + SKY_OVERLAP_BELOW_HEADER}
        />
      )}

      <View onLayout={handleHeaderLayout}>
        <View style={styles.headerRow}>
          <SettingsButton />
        </View>

        <View style={styles.header}>
          <Text
            ref={titleRef}
            accessibilityRole="header"
            style={styles.title}
          >
            List
          </Text>

          <Text style={styles.subtitle}>
            Look at an overview of the future
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        {status === 'loading' && (
          <View style={styles.statusCard}>
            <ActivityIndicator color={colors.deepOlive} />
            <Text
              style={styles.statusText}
              accessibilityLiveRegion="polite"
            >
              Loading your assignments…
            </Text>
          </View>
        )}

        {status === 'signedOut' && (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>
              Sign in to RISE to view your assignments.
            </Text>
            <Text style={styles.statusNote}>
              A signed-in account is required to load your saved coursework.
            </Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.statusCard}>
            <Text accessibilityRole="alert" style={styles.statusText}>
              Couldn’t load your assignments.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={refreshAssignments}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {status === 'ready' && assignments.length === 0 && (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>
              No assignments to display.
            </Text>
            <Text style={styles.statusNote}>
              Connect and sync your Canvas courses to import assignments.
            </Text>
          </View>
        )}

        {/* No due-soon cutoff: display every assignment returned. */}
        {status === 'ready' &&
          assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              today={date}
            />
          ))}

        {status === 'ready' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh assignments"
            onPress={refreshAssignments}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.retryText}>Refresh assignments</Text>
          </Pressable>
        )}
      </View>
    </TabScreenScrollView>
  );
}

// Keep the existing card design and shared theme.
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 36,
  },
  headerRow: {
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  header: {
    paddingBottom: 8,
  },
  title: {
    ...textStyles.screenHeading,
    color: colors.deepOlive,
  },
  subtitle: {
    ...textStyles.subtitle,
    color: colors.mutedGrayGreen,
    marginTop: 2,
  },
  list: {
    gap: 8,
    marginTop: 12,
  },
  card: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.softWhite,
    borderWidth: 1,
    borderColor: colors.mistGreen,
    borderRadius: 15,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  courseDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.deepOlive,
    marginRight: 16,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  assignmentTitle: {
    ...textStyles.cardTitle,
    color: colors.deepOlive,
  },
  description: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    marginTop: 2,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dueDate: {
    ...textStyles.tinyLabel,
    flexShrink: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: statusColors.progressTrack,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.softSage,
    borderRadius: 4,
  },
  progressText: {
    ...textStyles.tinyLabel,
    fontSize: 8,
    color: colors.mutedGrayGreen,
    minWidth: 26,
  },
  playCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.mistGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  statusCard: {
    padding: 20,
    gap: 10,
    alignItems: 'center',
    backgroundColor: colors.softWhite,
    borderWidth: 1,
    borderColor: colors.mistGreen,
    borderRadius: 15,
  },
  statusText: {
    ...textStyles.body,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  statusNote: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.mistGreen,
    justifyContent: 'center',
  },
  retryText: {
    ...textStyles.link,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  refreshButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});