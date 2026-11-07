import { Text, View } from 'react-native';

import type { PriorityLevel } from '../utils/assignmentPriority';
import { styles } from './PriorityPill.styles';

// Short text that fits on the pill.
export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  overdue: 'Overdue',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  noDueDate: 'No due date',
};

// Screen readers hear the full phrase, since "High" alone is unclear.
export const PRIORITY_ACCESSIBILITY_LABELS: Record<PriorityLevel, string> = {
  overdue: 'Overdue',
  high: 'High priority',
  medium: 'Medium priority',
  low: 'Low priority',
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
        accessibilityLabel={PRIORITY_ACCESSIBILITY_LABELS[level]}
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
