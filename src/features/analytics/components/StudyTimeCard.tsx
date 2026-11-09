import { StyleSheet, Text, View } from 'react-native';

import ClockIcon from '../../../../assets/icons/clock.svg';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';
import { formatStudyTime } from '../../studySessions/utils/studyTime';

/**
 * "Time spent studying" from the Figma "Analytics Overview" (#49): recorded
 * study time this week. The comparison with last week and the Week / Month /
 * All Time switch come with the analytics charts (#29).
 */
export function StudyTimeCard({ seconds }: { seconds: number | null }) {
  // null while loading or when it couldn't load.
  const value = seconds === null ? '–' : formatStudyTime(seconds);

  return (
    <View
      accessible
      accessibilityLabel={`Time spent studying this week, ${seconds === null ? 'not available' : value}`}
      style={styles.card}
    >
      <ClockIcon width={26} height={26} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>Time spent studying this week</Text>
    </View>
  );
}

// Sizes from the Figma "Study Time Card".
const styles = StyleSheet.create({
  card: {
    width: '48%',
    minHeight: 124,
    padding: 16,
    gap: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.mistGreen,
    backgroundColor: colors.softWhite,
  },
  value: {
    fontFamily: fonts.heading.bold,
    fontSize: 24,
    color: colors.deepOlive,
  },
  label: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.deepOlive,
  },
});
