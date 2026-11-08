import { StyleSheet } from 'react-native';

import { colors } from '../../../../theme/colors';
import { fonts } from '../../../../theme/typography';
import { calendarColors } from '../../calendarColors';

// Sizes from the Figma "Calendar settings" frame (#79). Sources and Dates
// aren't in Figma yet, so they reuse its row, heading, and divider styles.
const SIDE_PADDING = 19;
const ROW_HEIGHT = 52;
const ICON_BOX = 30;
const ROW_GAP = 14;

export const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  topBar: {
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  content: {
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 40,
    gap: 22,
  },
  heading: {
    fontFamily: fonts.heading.bold,
    fontSize: 18,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  section: {
    gap: 10,
  },
  sectionHeading: {
    fontFamily: fonts.heading.bold,
    fontSize: 18,
    color: colors.deepOlive,
  },
  divider: {
    height: 1,
    backgroundColor: colors.mistGreen,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
  },
  rowPressed: {
    opacity: 0.6,
  },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // "No type" has no Figma icon; a solid dot in the type icons' black, a
  // little smaller than the icons so it doesn't look heavier than them.
  noTypeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: calendarColors.typeIcon,
  },
  // Figma "Course Rows" (#159): taller rows with a round chip in the course's
  // color, and a checkmark instead of a toggle.
  courseRow: {
    height: 56,
  },
  courseIconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.softSage,
  },
  checkboxUnchecked: {
    borderWidth: 1.5,
    borderColor: colors.mutedGrayGreen,
  },
  label: {
    flex: 1,
    fontFamily: fonts.heading.semiBold,
    fontSize: 16,
    color: colors.deepOlive,
  },
  // A date row's value: "Any" until a day is picked.
  dateValue: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 16,
    color: colors.deepOlive,
  },
  dateValueEmpty: {
    color: colors.mutedGrayGreen,
  },
  clearDate: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.eucalyptus,
  },
  datePicker: {
    paddingBottom: 8,
  },
  toggleTrack: {
    width: 40,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 3,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    alignItems: 'flex-end',
    backgroundColor: colors.softSage,
  },
  toggleTrackOff: {
    alignItems: 'flex-start',
    backgroundColor: calendarColors.toggleOff,
  },
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.softWhite,
  },
  // Figma "Done Button".
  doneButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.eucalyptus,
  },
  doneButtonText: {
    fontFamily: fonts.heading.bold,
    fontSize: 15,
    color: colors.softWhite,
  },
});
