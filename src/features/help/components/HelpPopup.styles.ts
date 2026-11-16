import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

// Sizes and colors follow the Figma "Help Popup" (#70). The grays and black
// buttons match the app's other popups, e.g. "Calendar connected!".
const BORDER_GRAY = '#E4E3E3';
const TEXT_GRAY = '#71717B';
const BLACK = '#000000';

// The sage behind the lightbulb, at 5% and 15%.
const ICON_RING = 'rgba(105, 131, 108, 0.05)';
const ICON_CIRCLE = 'rgba(105, 131, 108, 0.15)';

const CONTENT_WIDTH = 260;

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    padding: 32,
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
    backgroundColor: colors.softWhite,

    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  iconRing: {
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ICON_RING,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ICON_CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  text: {
    width: CONTENT_WIDTH,
    gap: 12,
  },

  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 20,
    color: BLACK,
    textAlign: 'center',
  },

  message: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    lineHeight: 19,
    color: TEXT_GRAY,
    textAlign: 'center',
  },

  buttons: {
    width: CONTENT_WIDTH,
    gap: 8,
  },

  // "Take a breath", "Ask for an extension" and "Book office hours".
  optionButton: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BLACK,
    backgroundColor: colors.softWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionText: {
    fontFamily: fonts.heading.bold,
    fontSize: 15,
    color: BLACK,
  },

  // "Not right now".
  closeButton: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BLACK,
    backgroundColor: BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeText: {
    fontFamily: fonts.heading.bold,
    fontSize: 15,
    color: colors.softWhite,
  },

  pressed: {
    opacity: 0.72,
  },
});
