import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

// Matches the bordered box in CanvasSettingsModal.styles.ts.
const BORDER_GRAY = '#E4E3E3';

export const styles = StyleSheet.create({
  section: {
    alignSelf: 'stretch',
    gap: 8,
  },

  // Keeps the pop-up on screen when a student has many classes.
  list: {
    maxHeight: 220,
  },

  listContent: {
    gap: 8,
  },

  heading: {
    fontFamily: fonts.heading.bold,
    fontSize: 13,
    color: '#000000',
  },

  row: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
    borderRadius: 12,
  },

  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.softWhite,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },

  courseName: {
    flex: 1,
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.deepOlive,
  },

  courseNameOff: {
    color: colors.mutedGrayGreen,
  },

  // The default iOS switch is a little large for this pop-up.
  switch: {
    transform: [{ scale: 0.8 }],
  },

  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 2,
  },

  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },

  swatchSelected: {
    borderWidth: 3,
    borderColor: colors.softWhite,
    outlineWidth: 2,
    outlineColor: colors.deepOlive,
    outlineStyle: 'solid',
  },
});
