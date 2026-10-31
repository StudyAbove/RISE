import { StyleSheet } from 'react-native';

import { priorityColors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

// Shape follows the "High Priority" pill on the Figma assignment details.
export const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  // Smaller on assignment cards so it fits beside the title.
  smallPill: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  label: {
    fontFamily: fonts.body.semiBold,
    fontSize: 11,
  },
  smallLabel: {
    fontSize: 9,
  },

  overdue: { backgroundColor: priorityColors.overdueBackground },
  overdueLabel: { color: priorityColors.overdueText },
  high: { backgroundColor: priorityColors.highBackground },
  highLabel: { color: priorityColors.highText },
  medium: { backgroundColor: priorityColors.mediumBackground },
  mediumLabel: { color: priorityColors.mediumText },
  noDueDate: { backgroundColor: priorityColors.noDueDateBackground },
  noDueDateLabel: { color: priorityColors.noDueDateText },
});
