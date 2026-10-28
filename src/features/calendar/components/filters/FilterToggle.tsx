import { View } from 'react-native';

import { styles } from './CalendarFilterSheet.styles';

/**
 * The on/off switch on the filter sheet (Figma "Toggle"). It's only drawn
 * here; the whole row is the button, so it's easier to tap and VoiceOver
 * reads the row's name with its state.
 */
export function FilterToggle({ on }: { on: boolean }) {
  return (
    <View
      testID="filter-toggle"
      style={[styles.toggleTrack, on ? styles.toggleTrackOn : styles.toggleTrackOff]}
      accessible={false}
    >
      <View style={styles.toggleKnob} />
    </View>
  );
}
