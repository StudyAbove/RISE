// Global setup that runs before every test file.

// Safe-area insets come from native code, so use the library's Jest mock
// (iPhone-like insets) instead.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
