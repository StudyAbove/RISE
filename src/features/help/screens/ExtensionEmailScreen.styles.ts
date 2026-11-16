import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

// Sizes and spacing follow the Figma "Help - Email" screen.
export const styles = StyleSheet.create({
  form: {
    marginTop: 25,
    gap: 14,
  },
  fieldNote: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.mutedGrayGreen,
    marginTop: -8,
  },
  textInput: {
    paddingVertical: 12,
  },
  reasonInput: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  previewTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 14,
    color: colors.deepOlive,
    marginTop: 14,
    marginBottom: 2,
  },
  previewCard: {
    minHeight: 239,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.mistGreen,
    backgroundColor: colors.softWhite,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  subject: {
    fontFamily: fonts.body.semiBold,
    fontSize: 9.5,
    lineHeight: 14,
    color: colors.deepOlive,
  },
  // TextInputs add their own padding; remove it so the editable email lines
  // up like plain text in the card.
  subjectInput: {
    flex: 1,
    padding: 0,
  },
  bodyInput: {
    padding: 0,
    textAlignVertical: 'top',
  },
  previewText: {
    fontFamily: fonts.body.regular,
    fontSize: 9.5,
    lineHeight: 14,
    color: colors.deepOlive,
  },
  // The Figma template before the email is written.
  templateText: {
    color: colors.mutedGrayGreen,
  },
  generating: {
    flex: 1,
    minHeight: 209,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  message: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.deepOlive,
    marginTop: 12,
  },
  primaryButton: {
    height: 50,
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: colors.butterYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: fonts.heading.bold,
    fontSize: 15,
    color: colors.deepOlive,
  },
  secondaryButton: {
    minHeight: 44,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.eucalyptus,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.7,
  },
});
