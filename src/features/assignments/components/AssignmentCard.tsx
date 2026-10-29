import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { format, isSameYear } from 'date-fns';
import { isAssignmentUrgent } from '../utils/isAssignmentUrgent';
import Svg, { Path, Rect } from 'react-native-svg';

import type { Assignment } from '../../../repositories/assignmentsRepository';
import { colors, statusColors } from '../../../theme/colors';
import { fonts, textStyles } from '../../../theme/typography';

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
// Study Plan, List, and Home reuse this same component.
//
// The Home variant (High Priority Tasks, #58) shows the class instead of the
// description and has no progress bar, per the Figma Home Page. `getAhead`
// marks big work suggested early, so it looks different from work due soon.
export function AssignmentCard({
  assignment,
  today,
  variant = 'list',
  getAhead = false,
}: {
  assignment: Assignment;
  today: Date;
  variant?: 'list' | 'home';
  getAhead?: boolean;
}) {
  const isHome = variant === 'home';

  const navigation = useNavigation();

  // This is assignment completion, not microtask progress.
  const completionPercent = assignment.completed ? 100 : 0;

  // Highlight incomplete assignments due within 24 hours or already overdue.
  const needsAttention = isAssignmentUrgent(
    assignment.dueAt,
    assignment.completed,
    today,
  );

  // Red when due within 24 hours, even on a get-ahead card.
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        isHome
          ? `${assignment.title}. Course: ${courseLabel}. ${getAhead ? 'Get ahead. ' : ''}${dueLabel}.`
          : `${assignment.title}. Course: ${courseLabel}. ${dueLabel}. ${description}. ${completionPercent}% complete.`
      }
      accessibilityHint="Opens assignment details"
      onPress={() =>
        navigation.navigate('AssignmentDetails', {
          assignmentId: assignment.id,
        })
      }
      style={({ pressed }) => [
        styles.card,
        isHome && styles.homeCard,
        pressed && styles.pressed,
      ]}
    >
      {/* Use the student's saved course color. */}
      <View
        accessible={false}
        style={[
          styles.courseDot,
          { backgroundColor: assignment.courseColor },
        ]}
      />

      <View style={styles.cardContent}>
        <Text style={styles.assignmentTitle} numberOfLines={isHome ? 1 : undefined}>
          {assignment.title}
        </Text>

        {/* Shorten only what is visible, without rewriting the instructions. */}
        <Text
          style={styles.description}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {isHome ? courseLabel : description}
        </Text>

        <View style={styles.dueRow}>
          <CalendarIcon color={dueColor} />

          <Text style={[styles.dueDate, { color: dueColor }]}>
            {getAhead && <Text style={styles.getAheadLabel}>Get ahead · </Text>}
            {dueLabel}
          </Text>
        </View>

        {/* Until microtasks are available, completion is 0% or 100%. */}
        {!isHome && (
          <View style={styles.progressRow}>
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
        )}
      </View>

      {/* Decorative icon. Pressing anywhere on the card opens details. */}
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
    </Pressable>
  );
}

// Keep the existing card design and shared theme.
const styles = StyleSheet.create({
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
  // Figma Home Page task cards: thicker border, a little shorter.
  homeCard: {
    minHeight: 74,
    borderWidth: 2,
    borderRadius: 14,
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
  getAheadLabel: {
    fontFamily: fonts.body.bold,
    color: colors.eucalyptus,
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
  pressed: {
    opacity: 0.7,
  },
});