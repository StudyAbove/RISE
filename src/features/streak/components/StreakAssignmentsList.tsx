import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';

import type { StreakAssignment } from '../utils/streak';
import { styles } from './StreakAssignmentsList.styles';

// How many show before "Show all".
const COLLAPSED_COUNT = 5;

interface StreakAssignmentsListProps {
  assignments: StreakAssignment[];
}

/**
 * "This streak" on the Streak page (#10): the assignments that kept the
 * current streak going, newest first. Tapping one opens its details.
 */
export function StreakAssignmentsList({ assignments }: StreakAssignmentsListProps) {
  const navigation = useNavigation();
  const [expanded, setExpanded] = useState(false);

  const shown = expanded ? assignments : assignments.slice(0, COLLAPSED_COUNT);
  const hiddenCount = assignments.length - shown.length;

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        This streak
      </Text>

      <View style={styles.list}>
        {shown.map(({ assignment, completedAt }) => {
          const turnedIn = `Turned in ${format(completedAt, 'EEE, MMM d')}`;

          return (
            <Pressable
              key={assignment.id}
              accessibilityRole="button"
              accessibilityLabel={[assignment.title, assignment.courseCode, turnedIn]
                .filter(Boolean)
                .join(', ')}
              onPress={() =>
                navigation.navigate('AssignmentDetails', { assignmentId: assignment.id })
              }
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={[styles.dot, { backgroundColor: assignment.courseColor }]} />

              <View style={styles.details}>
                <Text style={styles.assignmentTitle} numberOfLines={1}>
                  {assignment.title}
                </Text>
                {assignment.courseCode && (
                  <Text style={styles.courseCode}>{assignment.courseCode}</Text>
                )}
              </View>

              <Text style={styles.turnedIn}>{turnedIn}</Text>
            </Pressable>
          );
        })}
      </View>

      {hiddenCount > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded(true)}
          style={({ pressed }) => [styles.showAll, pressed && styles.pressed]}
        >
          <Text style={styles.showAllText}>Show all ({assignments.length})</Text>
        </Pressable>
      )}
    </View>
  );
}
