import { Pressable, Text, View } from 'react-native';

import type { CalendarViewMode } from '../utils/calendarDates';
import { styles } from './CalendarViewSwitcher.styles';

const VIEW_OPTIONS: { view: CalendarViewMode; label: string }[] = [
  { view: 'month', label: 'Month' },
  { view: 'week', label: 'Week' },
  { view: 'twoDay', label: '2 Day' },
  { view: 'day', label: 'Day' },
];

interface CalendarViewSwitcherProps {
  selectedView: CalendarViewMode;
  onSelectView: (view: CalendarViewMode) => void;
}

/** The Month / Week / 2 Day / Day segmented control under the calendar header. */
export function CalendarViewSwitcher({ selectedView, onSelectView }: CalendarViewSwitcherProps) {
  const selectedIndex = VIEW_OPTIONS.findIndex(({ view }) => view === selectedView);

  return (
    <View accessibilityRole="tablist" style={styles.container}>
      {VIEW_OPTIONS.map(({ view, label }, index) => {
        const isSelected = view === selectedView;
        // The green highlight covers the lines on both of its sides, as in Figma.
        const showDivider = index > 0 && index !== selectedIndex && index !== selectedIndex + 1;

        return (
          <Pressable
            key={view}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelectView(view)}
            style={[
              styles.option,
              showDivider && styles.divider,
              isSelected && styles.selectedOption,
            ]}
          >
            <Text style={[styles.label, isSelected && styles.selectedLabel]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
