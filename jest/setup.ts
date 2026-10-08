// Global setup that runs before every test file.

// Safe-area insets come from native code, so use the library's Jest mock
// (iPhone-like insets) instead.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// The real Supabase client needs network access and env vars, so tests get a
// signed-out stand-in. Tests that need a signed-in user can override this
// with their own jest.mock('<path>/lib/supabase', ...).
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null } })),
    },
    from: jest.fn(() => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
    })),
  },
}));
