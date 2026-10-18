import { StyleSheet } from 'react-native';

import { colors, statusColors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';
import { calendarColors } from '../calendarColors';

// Sizes from the Figma "Biology Details" frame.
const CIRCLE_SIZE = 85;
// The circle sits over the top edge of the main card by this much.
const CIRCLE_OVERLAP = 11;
const CARD_RADIUS = 20;
// Row icons start 20pt from the card edge and the text at 65pt.
const ROW_ICON_SIZE = 25;
const ROW_SIDE_PADDING = 20;

export const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: calendarColors.detailsBackground,
  },
  topBar: {
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  content: {
    paddingHorizontal: 19,
    paddingBottom: 40,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    // Above the card it overlaps.
    zIndex: 1,
  },
  classIcon: {
    width: 44,
    height: 44,
  },
  card: {
    backgroundColor: colors.softWhite,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: calendarColors.hairline,
  },
  mainCard: {
    marginTop: -CIRCLE_OVERLAP,
    paddingTop: CIRCLE_OVERLAP + 16,
    paddingBottom: 12,
  },
  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 20,
    color: colors.deepOlive,
    textAlign: 'center',
    paddingHorizontal: ROW_SIDE_PADDING,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 65 - ROW_SIDE_PADDING - ROW_ICON_SIZE,
    minHeight: 64,
    paddingHorizontal: ROW_SIDE_PADDING,
  },
  rowIcon: {
    width: ROW_ICON_SIZE,
    height: ROW_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The Google, Apple, Canvas, and RISE logos are full-color images, so a
  // little smaller than the line icons to look the same size.
  sourceLogo: {
    width: 22,
    height: 22,
    borderRadius: 5,
  },
  // Same dark gray as the line icons.
  appleLogo: {
    tintColor: '#1E1E1E',
  },
  rowText: {
    flex: 1,
  },
  rowLine: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#000000',
  },
  notesCard: {
    marginTop: 16,
    padding: ROW_SIDE_PADDING,
    gap: 12,
  },
  notesHeading: {
    fontFamily: fonts.heading.bold,
    fontSize: 18,
    color: colors.deepOlive,
  },
  notesBox: {
    borderWidth: 0.5,
    borderColor: calendarColors.hairline,
    borderRadius: 10,
    padding: 12,
  },
  notesText: {
    fontFamily: fonts.body.light,
    fontSize: 14,
    lineHeight: 20,
    color: '#6D6D6D',
  },
  buttons: {
    flexDirection: 'row',
    gap: 13,
    marginTop: 24,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: colors.softWhite,
    borderWidth: 2,
    borderColor: colors.deepOlive,
  },
  deleteButton: {
    backgroundColor: statusColors.urgentRed,
  },
  // While a delete is running.
  disabledButton: {
    opacity: 0.6,
  },
  deletingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editLabel: {
    fontFamily: fonts.heading.bold,
    fontSize: 14,
    color: colors.deepOlive,
  },
  deleteLabel: {
    fontFamily: fonts.heading.bold,
    fontSize: 14,
    color: colors.softWhite,
  },
});
