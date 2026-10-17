import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Covers the whole sheet, above the form.
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  // Clear, so the form stays visible; tapping it closes the dropdown.
  outside: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  panel: {
    position: 'absolute',
    marginTop: 0,
  },
  hidden: {
    top: 0,
    left: 0,
    right: 0,
  },
  measuring: {
    opacity: 0,
  },
});
