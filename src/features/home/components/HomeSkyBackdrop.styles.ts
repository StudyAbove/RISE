import { StyleSheet } from 'react-native';

// Position and size are set in the component because they scale with the
// screen width.
export const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fade: {
    ...StyleSheet.absoluteFill,
  },
});
