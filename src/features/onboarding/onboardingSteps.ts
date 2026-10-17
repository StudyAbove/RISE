/**
 * Position of each onboarding screen in the page indicator, matching Figma.
 * Step 3 has no screen in RISE: it's the student opening the sign-in link
 * from their email app.
 */
export const ONBOARDING_STEPS = {
  email: 1,
  checkInbox: 2,
  connectClasses: 4,
  connectCalendar: 5,
  allSet: 6,
} as const;

export const ONBOARDING_STEP_COUNT = 6;
