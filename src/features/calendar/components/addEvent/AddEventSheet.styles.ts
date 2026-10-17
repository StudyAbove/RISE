import { StyleSheet } from 'react-native';

import { colors } from '../../../../theme/colors';
import { fonts } from '../../../../theme/typography';

// Sizes from the Figma "Add Event" frame. Figma's gaps between fields vary
// (12–30pt), so they're evened out to 16pt here.
const SIDE_PADDING = 19;

export const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  keyboardArea: {
    flex: 1,
  },
  topBar: {
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  content: {
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 40,
  },
  fields: {
    gap: 16,
  },
  heading: {
    fontFamily: fonts.heading.bold,
    fontSize: 20,
    color: colors.deepOlive,
    textAlign: 'center',
    marginBottom: 4,
  },
  // Start and End sit side by side under the "Time" label.
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  timeColumn: {
    flex: 1,
  },
  saveError: {
    textAlign: 'center',
  },
  // Figma "Button / Secondary".
  addButton: {
    height: 50,
    marginTop: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.eucalyptus,
  },
  addButtonSaving: {
    opacity: 0.7,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButtonText: {
    fontFamily: fonts.heading.bold,
    fontSize: 15,
    color: colors.softWhite,
  },
});
