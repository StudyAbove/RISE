import { StyleSheet } from 'react-native';

import { colors, statusColors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

// Sizes and colors follow Figma's "Canvas Settings" pop-up.
const BORDER_GRAY = '#E4E3E3';
const TEXT_GRAY = '#71717B';
const INACTIVE_DOT = '#C9CCC9';

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },

  card: {
    width: 320,
    padding: 32,
    gap: 20,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colors.softWhite,
  },

  iconOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },

  iconInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },

  icon: {
    width: 20,
    height: 20,
  },

  textBlock: {
    gap: 8,
    alignItems: 'center',
  },

  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 20,
    color: '#000000',
    textAlign: 'center',
  },

  message: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: TEXT_GRAY,
    textAlign: 'center',
  },

  box: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: BORDER_GRAY,
    borderRadius: 12,
  },

  boxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  boxRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER_GRAY,
  },

  codeLabels: {
    flex: 1,
  },

  statusLabels: {
    flex: 1,
  },

  rowTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 13,
    lineHeight: 16.25,
    color: '#000000',
  },

  rowDetail: {
    fontFamily: fonts.body.medium,
    fontSize: 11,
    lineHeight: 16.5,
    color: TEXT_GRAY,
  },

  code: {
    fontFamily: fonts.heading.extraBold,
    fontSize: 20,
    letterSpacing: 2,
    color: colors.deepOlive,
  },

  // Same pill as Figma's "Download" button.
  newCodeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.eucalyptus,
  },

  newCodeButtonText: {
    fontFamily: fonts.heading.bold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.softWhite,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: INACTIVE_DOT,
  },

  statusDotConnected: {
    backgroundColor: colors.eucalyptus,
  },

  error: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: statusColors.urgentRed,
    textAlign: 'center',
  },

  closeButton: {
    alignSelf: 'stretch',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.eucalyptus,
  },

  closeButtonText: {
    fontFamily: fonts.heading.bold,
    fontSize: 14,
    color: colors.softWhite,
  },

  pressed: {
    opacity: 0.8,
  },
});
