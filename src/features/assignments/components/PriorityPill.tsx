import { Text, View } from 'react-native';

import type { PriorityLevel } from '../utils/assignmentPriority';
import { styles } from './PriorityPill.styles';

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  overdue: 'Overdue',
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Low Priority',
  noDueDate: 'No due date',
};

/** An assignment's priority (#86). Low priority shows no pill. */
export function PriorityPill({
  level,
  size = 'regular',
}: {
  level: PriorityLevel;
  size?: 'regular' | 'small';
}) {
  if (level === 'low') return null;

  const isSmall = size === 'small';

  return (
    <View style={[styles.pill, isSmall && styles.smallPill, styles[level]]}>
      <Text
        style={[
          styles.label,
          isSmall && styles.smallLabel,
          styles[`${level}Label`],
        ]}
      >
        {PRIORITY_LABELS[level]}
      </Text>
    </View>
  );
}
