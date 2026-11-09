import { Pressable, Text, View } from 'react-native';

import { styles } from './CalendarFilterNotice.styles';

interface CalendarFilterNoticeProps {
  /** True when the filters leave nothing to show in the current view. */
  noMatches: boolean;
  /** Turns every filter off. */
  onShowAll: () => void;
}

/**
 * The line under the view switcher while filters are on (#79), so hidden
 * events are never a surprise, with a way to show everything again.
 */
export function CalendarFilterNotice({ noMatches, onShowAll }: CalendarFilterNoticeProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.message} accessibilityLiveRegion="polite">
        {noMatches ? 'No events match your filters' : 'Some events are hidden'}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Show all events"
        hitSlop={10}
        onPress={onShowAll}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Text style={styles.showAll}>Show all</Text>
      </Pressable>
    </View>
  );
}
