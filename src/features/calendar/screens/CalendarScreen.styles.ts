import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,

    // The banner bleeds past the screen edges, so clip it here.
    overflow: 'hidden',

    backgroundColor:
      colors.warmCream,
  },

  body: {
    flex: 1,
  },

  syncRow: {
    minHeight: 44,

    flexDirection:
      'row',

    alignItems:
      'center',

    justifyContent:
      'space-between',

    paddingHorizontal: 18,

    paddingVertical: 7,

    borderBottomWidth:
      StyleSheet.hairlineWidth,

    borderBottomColor:
      colors.mistGreen,

    backgroundColor:
      colors.warmCream,
  },

  syncStatusText: {
    flex: 1,

    marginRight: 12,

    fontSize: 13,

    color:
      colors.mutedGrayGreen,
  },

  syncStatusError: {
    color:
      colors.deepOlive,
  },

  syncButton: {
    minHeight: 32,

    minWidth: 74,

    paddingHorizontal: 12,

    alignItems:
      'center',

    justifyContent:
      'center',

    borderWidth: 1,

    borderColor:
      colors.mistGreen,

    borderRadius: 16,

    backgroundColor:
      colors.warmCream,
  },

  syncButtonPressed: {
    backgroundColor:
      colors.mistGreen,
  },

  syncButtonDisabled: {
    opacity: 0.55,
  },

  syncButtonText: {
    fontSize: 13,

    fontWeight: '700',

    color:
      colors.eucalyptus,
  },

  // Lets the today card's band stretch to the bottom when the month is short.
  monthContent: {
    flexGrow: 1,
  },
});