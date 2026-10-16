import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { TabScreenScrollView } from '../../../components/TabScreenScrollView';
import { useCurrentDate } from '../../../hooks/useCurrentDate';
import assignmentData from '../../../mocks/studyPlanAssignments.json';
import { colors, statusColors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';
import { HomeSkyBackdrop } from '../../home/components/HomeSkyBackdrop';
import { getTimeOfDay } from '../../home/utils/greeting';
import type { MainTabParamList } from '../../navigation/types';
import { SettingsButton } from '../../settings/components/SettingsButton';

// Information stored for each small task.
type Microtask = {
  id: string;
  order: number;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
};

// Information stored for each assignment.
type Assignment = {
  id: string;
  course: string;
  courseColor: string;
  title: string;
  shortDescription: string;
  description: string;
  priority: string;
  dueDate: string;
  estimatedMinutes: number | null;
  microtasks: Microtask[];
};

const assignments: Assignment[] = assignmentData;

// Turn a number of minutes into readable text.
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (hours === 0) return `${remaining} min`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

// Draw the calendar icon using the existing SVG package.
function CalendarIcon() {
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
        stroke={statusColors.urgentRed}
        strokeWidth={2}
      />
      <Path
        d="M8 3v4M16 3v4M3 11h18"
        stroke={statusColors.urgentRed}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Reuse the same popup for whichever assignment was selected.
function AssignmentPopup({
  assignment,
  onClose,
}: {
  assignment: Assignment;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  // Sort a copy so the original JSON order is not changed.
  const tasks = [...assignment.microtasks].sort(
    (first, second) => first.order - second.order,
  );

  const completedCount = tasks.filter((task) => task.completed).length;
  const progress =
    tasks.length === 0 ? 0 : (completedCount / tasks.length) * 100;

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalPage,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {/* Close the popup and return to Study Plan. */}
        <View style={styles.modalHeader}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Back to Study Plan"
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
        </View>

        {/* Allow long details and task lists to scroll. */}
        <ScrollView
          contentContainerStyle={styles.detailsContent}
          accessibilityViewIsModal
        >
          <View style={styles.courseRow}>
            <View
              style={[
                styles.courseDot,
                { backgroundColor: assignment.courseColor },
              ]}
            />
            <Text style={styles.courseText}>
              {assignment.course}
            </Text>
          </View>

          <View style={styles.detailTitleRow}>
            <Text
              accessibilityRole="header"
              style={styles.detailTitle}
            >
              {assignment.title}
            </Text>

            <Text style={styles.priorityBadge}>
              {assignment.priority}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.dueRow}>
              <CalendarIcon />
              <Text style={styles.dueText}>
                Due {assignment.dueDate}
              </Text>
            </View>

            {assignment.estimatedMinutes !== null && (
              <Text style={styles.estimateText}>
                Est. {formatTime(assignment.estimatedMinutes)}
              </Text>
            )}
          </View>

          <Text style={styles.detailDescription}>
            {assignment.description}
          </Text>

          {/* Show progress when a task breakdown exists. */}
          {tasks.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Progress</Text>

              <View
                style={styles.progressRow}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel="Assignment progress"
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

                <Text style={styles.progressLabel}>
                  {completedCount} / {tasks.length} tasks
                </Text>
              </View>
            </>
          )}

          <Text
            accessibilityRole="header"
            style={styles.sectionTitle}
          >
            Tasks
          </Text>

          {/* An empty task list shows the message required by AC 4. */}
          {tasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                No microtasks available yet
              </Text>
            </View>
          ) : (
            <View style={styles.taskList}>
              {tasks.map((task, index) => (
                <View key={task.id} style={styles.taskCard}>
                  {/* Numbers make the suggested order clear. */}
                  <View style={styles.taskNumber}>
                    <Text style={styles.taskNumberText}>
                      {index + 1}
                    </Text>
                  </View>

                  <View style={styles.taskContent}>
                    <Text style={styles.taskTitle}>
                      {task.title}
                    </Text>
                    <Text style={styles.taskTime}>
                      Est. {formatTime(task.estimatedMinutes)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// Main Study Plan page with sample assignments for this sprint.
export function StudyScreen() {
  // Use the existing bottom tab routes to open the List page.
  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const titleRef = useRef<Text>(null);
  const date = useCurrentDate();

  // Null means the assignment popup is closed.
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);

  const [headerBottom, setHeaderBottom] = useState<number | null>(null);

  // Measure the header so the hills line up behind it.
  const handleHeaderLayout = ({
    nativeEvent: { layout },
  }: LayoutChangeEvent) => {
    setHeaderBottom(layout.y + layout.height);
  };

  return (
    <>
      <TabScreenScrollView
        focusTargetRef={titleRef}
        contentContainerStyle={styles.container}
      >
        {/* Reuse the team's artwork without changing its files. */}
        {headerBottom !== null && (
          <HomeSkyBackdrop
            timeOfDay={getTimeOfDay(date)}
            bottom={headerBottom + 8}
          />
        )}

        <View onLayout={handleHeaderLayout}>
          <View style={styles.headerRow}>
            <SettingsButton />
          </View>

          <Text
            ref={titleRef}
            accessibilityRole="header"
            style={styles.pageTitle}
          >
            Study Plan
          </Text>
        </View>

        {/* Open the full assignment list when View All is tapped. */}
        <View style={styles.viewAllRow}>
          <Pressable
            onPress={() => navigation.navigate('List')}
            accessibilityRole="button"
            accessibilityLabel="View all assignments"
            hitSlop={8}
            style={({ pressed }) => [
              styles.viewAllButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>

        {/* Create a card for each assignment in the JSON. */}
        <View style={styles.assignmentList}>
          {assignments.map((assignment) => (
            <Pressable
              key={assignment.id}
              onPress={() => setSelectedAssignment(assignment)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${assignment.title}, ${assignment.course}`}
              style={({ pressed }) => [
                styles.assignmentCard,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.courseDot,
                  { backgroundColor: assignment.courseColor },
                ]}
              />

              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>
                  {assignment.title}
                </Text>

                <Text style={styles.cardDescription}>
                  {assignment.shortDescription}
                </Text>

                <View style={styles.dueRow}>
                  <CalendarIcon />
                  <Text style={styles.dueText}>
                    Due {assignment.dueDate}
                  </Text>
                </View>
              </View>

              <View style={styles.playCircle} accessible={false}>
                <Svg width={14} height={14} viewBox="0 0 14 14">
                  <Path
                    d="M4 2v10l8-5z"
                    fill={colors.deepOlive}
                  />
                </Svg>
              </View>
            </Pressable>
          ))}
        </View>
      </TabScreenScrollView>

      {/* Give the popup the selected assignment's data. */}
      {selectedAssignment !== null && (
        <AssignmentPopup
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  headerRow: {
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pageTitle: {
    ...textStyles.screenHeading,
    color: colors.deepOlive,
    paddingBottom: 8,
  },
  viewAllRow: {
    alignItems: 'flex-end',
    marginTop: 20,
    marginBottom: 12,
  },
  viewAllButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  viewAllText: {
    ...textStyles.link,
    color: colors.eucalyptus,
    textDecorationLine: 'underline',
  },
  assignmentList: {
    gap: 10,
  },
  assignmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 86,
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.mistGreen,
    backgroundColor: colors.softWhite,
    gap: 12,
  },
  courseDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.deepOlive,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  cardTitle: {
    ...textStyles.cardTitle,
    color: colors.deepOlive,
  },
  cardDescription: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    ...textStyles.tinyLabel,
    color: statusColors.urgentRed,
    flexShrink: 1,
  },
  playCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.mistGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },

  // Full-screen popup with safe-area spacing.
  modalPage: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mistGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  courseText: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
  },
  detailTitleRow: {
    gap: 8,
  },
  detailTitle: {
    ...textStyles.screenHeading,
    color: colors.deepOlive,
  },
  priorityBadge: {
    ...textStyles.tinyLabel,
    color: colors.deepOlive,
    backgroundColor: colors.paleSun,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  estimateText: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
  },
  detailDescription: {
    ...textStyles.body,
    color: colors.mutedGrayGreen,
    lineHeight: 21,
    marginTop: 14,
  },
  sectionTitle: {
    ...textStyles.sectionTitle,
    color: colors.deepOlive,
    marginTop: 24,
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: statusColors.progressTrack,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.softSage,
  },
  progressLabel: {
    ...textStyles.caption,
    color: colors.deepOlive,
  },
  taskList: {
    gap: 10,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.softWhite,
    borderWidth: 1,
    borderColor: colors.mistGreen,
    borderRadius: 12,
  },
  taskNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.mistGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskNumberText: {
    ...textStyles.caption,
    color: colors.deepOlive,
  },
  taskContent: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    ...textStyles.cardTitle,
    color: colors.deepOlive,
  },
  taskTime: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: colors.softWhite,
    borderWidth: 1,
    borderColor: colors.mistGreen,
    borderRadius: 12,
    padding: 20,
  },
  emptyTitle: {
    ...textStyles.body,
    color: colors.mutedGrayGreen,
  },
});