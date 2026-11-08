import { View } from 'react-native';

import CheckIcon from '../../../../../assets/icons/calendar/check.svg';
import { styles } from './CalendarFilterSheet.styles';

/**
 * The round checkmark on a course row (Figma "Task Checkbox"). Like
 * FilterToggle, it's only drawn here; the whole row is the button.
 */
export function CourseCheckbox({ checked }: { checked: boolean }) {
  return (
    <View
      testID="course-checkbox"
      style={[styles.checkbox, checked ? styles.checkboxChecked : styles.checkboxUnchecked]}
      accessible={false}
    >
      {checked && <CheckIcon width={11} height={11} />}
    </View>
  );
}
