import { StyleSheet } from 'react-native';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.heading.bold,
    fontSize: 20,
    color: colors.deepOlive,
  },

  headerSpacer: {
    width: 40,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },

  pressed: {
    opacity: 0.72,
  },

  disabledButton: {
    opacity: 0.5,
  },

  deleteAccountCard: {
    marginBottom: 16,
  },

  settingsChevronContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingsChevron: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },

  logoutCard: {
    height: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#758078',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  logoutIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    marginRight: 18,
  },

  logoutText: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 16,
    color: '#424758',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCard: {
    width: 324,
    height: 224,
    borderRadius: 16,
    backgroundColor: colors.softWhite,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },


  logoutModalCard: {
    height: 'auto',
    paddingTop: 36,
    paddingBottom: 24,
  },

  disconnectModalCard: {
    height: 'auto',
    paddingTop: 36,
    paddingBottom: 24,
  },

  warningIconOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(238, 178, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  warningIconInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(238, 178, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteAccountWarningIcon: {
    width: 24,
    height: 24,
  },

  deleteAccountWarningOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteAccountWarningInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },


  disconnectIconOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  disconnectIconInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  disconnectTrashIcon: {
    width: 22,
    height: 22,
  },

  modalTitle: {
    marginTop: 12,
    fontFamily: fonts.heading.bold,
    fontSize: 20,
    lineHeight: 27,
    color: '#000000',
    textAlign: 'center',
  },

  modalMessage: {
    width: 276,
    marginTop: 16,
    fontFamily: fonts.body.medium,
    fontSize: 14,
    lineHeight: 17,
    color: '#71717B',
    textAlign: 'center',
  },

  modalActions: {
    width: 276,
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },


  disconnectModalActions: {
    marginTop: 24,
  },

  modalButton: {
    width: 134,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCancelButton: {
    backgroundColor: '#000000',
  },

  modalLogoutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
  },

  modalCancelButtonText: {
    fontFamily: fonts.heading.bold,
    fontSize: 15,
    lineHeight: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },


  disconnectConfirmButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },

  deleteAccountConfirmButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
  },

  disconnectConfirmButtonText: {
    fontFamily: fonts.heading.bold,
    fontSize: 15,
    lineHeight: 18,
    color: '#EF4444',
    textAlign: 'center',
  },

  deleteAccountConfirmButtonText: {
    fontFamily: fonts.heading.bold,
    fontSize: 15,
    lineHeight: 18,
    color: '#000000',
    textAlign: 'center',
  },

  modalLogoutButtonText: {
    fontFamily: fonts.heading.bold,
    fontSize: 15,
    lineHeight: 18,
    color: '#000000',
    textAlign: 'center',
  },
});