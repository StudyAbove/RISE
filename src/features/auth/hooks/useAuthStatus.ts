export interface AuthStatus {
  isSignedIn: boolean;
  hasCompletedOnboarding: boolean;
}

/**
 * Tells the root navigator which flow to show: sign in, onboarding, or the
 * main app (the only flow with the bottom nav bar).
 *
 * TODO(auth): Replace the hardcoded values with the Supabase session and the
 * user's `onboardingCompleted` flag once authService is implemented. Until
 * then the app always opens on the main tabs so the team can build them.
 */
export function useAuthStatus(): AuthStatus {
  return {
    isSignedIn: true,
    hasCompletedOnboarding: true,
  };
}
