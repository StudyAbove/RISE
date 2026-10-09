/*
import { TabPlaceholderScreen } from '../../../components/TabPlaceholderScreen';

// Main page of the Study tab. Placeholder until the real screen is built.
export function StudyScreen() {
  return <TabPlaceholderScreen title="Study" showSettingsButton />;
}
*/
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TabScreenScrollView } from '../../../components/TabScreenScrollView';
import { SettingsButton } from '../../settings/components/SettingsButton';

type Microtask = {
  id: string;
  title: string;
  estimatedTime: string;
  completed: boolean;
};

type AssignmentDetail = {
  course: string;
  title: string;
  priority: string;
  dueDate: string;
  estimatedTime: string;
  description: string;
  microtasks: Microtask[];
};

const mockAssignment: AssignmentDetail = {
  course: 'BIO 200',
  title: 'Osmosis Lab Report',
  priority: 'High Priority',
  dueDate: 'Fri, Nov 13',
  estimatedTime: '1h 20m',
  description:
    'Write up the experimental results and conclusion in a lab report style.',
  microtasks: [
    {
      id: '1',
      title: 'Organize data and results',
      estimatedTime: '15 min',
      completed: false,
    },
    {
      id: '2',
      title: 'Create graphs and tables',
      estimatedTime: '20 min',
      completed: false,
    },
    {
      id: '3',
      title: 'Write the results section',
      estimatedTime: '25 min',
      completed: false,
    },
    {
      id: '4',
      title: 'Write the conclusion and proofread',
      estimatedTime: '20 min',
      completed: false,
    },
  ],
};

export function StudyScreen() {
  const titleRef = useRef<Text>(null);
  const completedTasks = mockAssignment.microtasks.filter(
    (task) => task.completed,
  ).length;
  const totalTasks = mockAssignment.microtasks.length;
  const progressPercent =
    totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

  return (
    <TabScreenScrollView
      focusTargetRef={titleRef}
      contentContainerStyle={styles.container}
    >
      <View style={styles.headerRow}>
        <View style={styles.backButton}>
          <Text style={styles.backButtonText}>‹</Text>
        </View>
        <SettingsButton />
      </View>

      <View style={styles.courseRow}>
        <View style={styles.courseDot} />
        <Text style={styles.courseText}>{mockAssignment.course}</Text>
      </View>

      <View style={styles.titleRow}>
        <Text ref={titleRef} accessibilityRole="header" style={styles.title}>
          {mockAssignment.title}
        </Text>
        <Text style={styles.priorityBadge}>{mockAssignment.priority}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.dueDateText}>▣ Due {mockAssignment.dueDate}</Text>
        <Text style={styles.estimatedTimeText}>
          ◷ Est. {mockAssignment.estimatedTime}
        </Text>
      </View>

      <Text style={styles.description}>{mockAssignment.description}</Text>

      <Text style={styles.sectionTitle}>Progress</Text>
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${progressPercent}%` }]}
          />
        </View>
        <Text style={styles.progressText}>
          {completedTasks} / {totalTasks} tasks
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Tasks</Text>
      <View style={styles.taskList}>
        {mockAssignment.microtasks.map((task) => (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.checkbox} />
            <View style={styles.taskTextGroup}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskTime}>Est. {task.estimatedTime}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.startButton}>
        <Text style={styles.startButtonText}>Start Study Session</Text>
      </View>
    </TabScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 26,
    paddingBottom: 40,
    backgroundColor: '#FAF8F1',
  },
  headerRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DDE9D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#35433A',
    fontSize: 32,
    lineHeight: 34,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  courseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#78927B',
    borderWidth: 1,
    borderColor: '#35433A',
    marginRight: 8,
  },
  courseText: {
    fontSize: 12,
    color: '#758078',
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#35433A',
  },
  priorityBadge: {
    fontSize: 11,
    color: '#B96D5F',
    backgroundColor: '#F5D8D3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
  },
  dueDateText: {
    fontSize: 12,
    color: '#B96D5F',
    fontWeight: '600',
  },
  estimatedTimeText: {
    fontSize: 12,
    color: '#758078',
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    color: '#758078',
    marginTop: 10,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#35433A',
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#E9E9E9',
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A8BEA3',
    borderRadius: 10,
  },
  progressText: {
    fontSize: 13,
    color: '#35433A',
    fontWeight: '600',
  },
  taskList: {
    gap: 10,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE9D9',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#758078',
    marginRight: 12,
  },
  taskTextGroup: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    color: '#35433A',
    fontWeight: '600',
  },
  taskTime: {
    fontSize: 11,
    color: '#758078',
    marginTop: 2,
  },
  startButton: {
    backgroundColor: '#F5D978',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  startButtonText: {
    color: '#35433A',
    fontSize: 15,
    fontWeight: '700',
  },
});