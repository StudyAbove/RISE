import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { AssignmentCard } from '../../assignments/components/AssignmentCard';
import {
  MAX_HIGH_PRIORITY_TASKS,
  type HighPriorityTask,
} from '../utils/highPriorityTasks';
import { styles } from './HighPriorityTasks.styles';

interface HighPriorityTasksProps {
  tasks: HighPriorityTask[];
  now: Date;
}

/** "High Priority Tasks" on Home (#58): due soon first, then get-ahead work. */
export function HighPriorityTasks({ tasks, now }: HighPriorityTasksProps) {
  const navigation = useNavigation();
  const shownTasks = tasks.slice(0, MAX_HIGH_PRIORITY_TASKS);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          High Priority Tasks
        </Text>

        <Pressable
          accessibilityRole="link"
          accessibilityHint="Opens your full assignment list"
          hitSlop={8}
          onPress={() => navigation.navigate('MainTabs', { screen: 'List' })}
        >
          <Text style={styles.viewAll}>View all</Text>
        </Pressable>
      </View>

      {shownTasks.length === 0 ? (
        <View style={styles.caughtUp} accessible>
          <Text style={styles.caughtUpTitle}>You’re all caught up!</Text>
          <Text style={styles.caughtUpText}>
            Nothing is due in the next 24 hours, and there’s no big work to start yet.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {shownTasks.map(({ assignment, reason }) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              today={now}
              variant="home"
              getAhead={reason === 'getAhead'}
            />
          ))}
        </View>
      )}
    </View>
  );
}
