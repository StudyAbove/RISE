import { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

// Reuse the team's scroll container, theme, and settings button.
import { TabScreenScrollView } from '../../../components/TabScreenScrollView';
import { colors, statusColors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';
import { SettingsButton } from '../../settings/components/SettingsButton';

// Reuse the team's sky artwork and time-of-day selection.
import { useCurrentDate } from '../../../hooks/useCurrentDate';
import { HomeSkyBackdrop } from '../../home/components/HomeSkyBackdrop';
import { getTimeOfDay } from '../../home/utils/greeting';

// Get the sample assignments from the JSON file.
import assignmentData from '../../../mocks/assignments.json';

// Describe the information each assignment should have.
type Assignment = {
  id: string;
  courseId: string;
  courseColor: string;
  title: string;
  description: string;
  dueDate: string;
  needsAttention: boolean;
  progress: number;
};

// TypeScript checks that the imported data has these fields.
const assignments: Assignment[] = assignmentData;

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

// Build one card. The list reuses this for every assignment.
function AssignmentCard({ assignment }: { assignment: Assignment }) {
  // Keep progress between 0 and 100 so the fill stays inside its track.
  const progress = Number.isFinite(assignment.progress)
    ? Math.min(100, Math.max(0, assignment.progress))
    : 0;

  // The mock data decides whether the due date needs red styling.
  const dueColor = assignment.needsAttention
    ? statusColors.urgentRed
    : colors.deepOlive;

  return (
    <View style={styles.card}>
      {/* The left circle gets its course color from the JSON. */}
      <View
        accessible
        accessibilityLabel={`Course: ${assignment.courseId}`}
        style={[
          styles.courseDot,
          { backgroundColor: assignment.courseColor },
        ]}
      />

      {/* Show this assignment's information from the JSON. */}
      <View style={styles.cardContent}>
        <Text style={styles.assignmentTitle}>
          {assignment.title}
        </Text>

        <Text style={styles.description}>
          {assignment.description}
        </Text>

        {/* Keep the calendar icon and due date together. */}
        <View style={styles.dueRow}>
          <CalendarIcon color={dueColor} />

          <Text style={[styles.dueDate, { color: dueColor }]}>
            Due {assignment.dueDate}
          </Text>
        </View>

        {/* The bar and percentage use the same progress value. */}
        <View
          style={styles.progressRow}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${assignment.title} progress`}
          accessibilityValue={{
            min: 0,
            max: 100,
            now: progress,
          }}
        >
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
              ]}
            />
          </View>

          <Text style={styles.progressText}>
            {progress}%
          </Text>
        </View>
      </View>

      {/* Display only. Opening assignment details comes later. */}
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

// Main page shown when the List tab is opened.
export function AssignmentsScreen() {
  const titleRef = useRef<Text>(null);
  const date = useCurrentDate();

  // Measure where the header ends to position the sky behind it.
  const [headerBottom, setHeaderBottom] = useState<number | null>(null);

  const handleHeaderLayout = ({
    nativeEvent: { layout },
  }: LayoutChangeEvent) => {
    setHeaderBottom(layout.y + layout.height);
  };

  return (
    <TabScreenScrollView
      focusTargetRef={titleRef}
      contentContainerStyle={styles.container}
    >
      {/* Draw the artwork first so it stays behind the header. */}
      {headerBottom !== null && (
        <HomeSkyBackdrop
          timeOfDay={getTimeOfDay(date)}
          bottom={headerBottom + SKY_OVERLAP_BELOW_HEADER}
        />
      )}

      {/* Measure the settings row, title, and subtitle together. */}
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

      {/* Show every assignment without filtering by due date. */}
      <View style={styles.list}>
        {assignments.length === 0 ? (
          <Text style={styles.emptyText}>
            No assignments to display.
          </Text>
        ) : (
          assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
            />
          ))
        )}
      </View>
    </TabScreenScrollView>
  );
}

// App colors and fonts come from the shared theme
const styles = StyleSheet.create({
  // Space around the page content.
  container: {
    paddingHorizontal: 18,
    paddingBottom: 36,
  },

  // Position the settings button on the right.
  headerRow: {
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  // leave room for the hills below the subtitle
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

  // space above the list and between its cards.
  list: {
    gap: 8,
    marginTop: 12,
  },

  // white rounded card with a light green border.
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

  // the course circle on the left Its fill comes from the JSON.
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

  // give the text room without pushing out the play icon
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

  // to place the calendar icon beside the date
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

  // place the progress bar beside its percentage
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },

  // the gray background of the progress bar
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: statusColors.progressTrack,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // for the green fill which shows the completion percentage
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

  // for the play buttons so pale green circle around the play icon on the right
  playCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.mistGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  // this is the message shown when the JSON list is empty
  emptyText: {
    ...textStyles.body,
    color: colors.mutedGrayGreen,
    paddingVertical: 24,
    textAlign: 'center',
  },
});