/**
 * RISE color palette, from the "Final Design" spec.
 * Use these instead of hardcoding hex values in components.
 */
export const colors = {
  softWhite: '#FFFFFF', // Cards, nav bar
  warmCream: '#FAF8F1', // Screen backgrounds
  paleSun: '#FFF1B8', // Count badges, highlighted card borders
  butterYellow: '#F5D978', // Selected pill in segmented controls
  mistGreen: '#DDE9D9', // Card borders, dividers, slider tracks
  softSage: '#A8BEA3', // Active tab, progress fill
  eucalyptus: '#78927B', // Links, primary buttons
  mutedGrayGreen: '#758078', // Secondary text
  deepOlive: '#35433A', // Main text, headings, icons
} as const;

/**
 * Colors used in the Figma screens that aren't part of the final palette.
 * Confirm with the designer before using them in new places.
 */
export const statusColors = {
  urgentRed: '#B85F55', // Due dates that need attention, e.g. "Due Fri, Nov 13"
  progressTrack: '#E5E6EB', // Empty part of assignment progress bars
  positiveGreen: '#32E86C', // Week-over-week gains on Analytics, e.g. "+18%"
} as const;

/**
 * Colors from the onboarding Figma screens that aren't part of the final palette.
 * Confirm with the designer before using them outside onboarding.
 */
export const onboardingColors = {
  heading: '#1E2E22', // Titles, e.g. "Connect your classes"
  bodyText: '#5C6A60', // Paragraphs under the titles
  wordmark: '#353333', // "RISE" in the top-left corner
  primaryButton: '#F5D166', // "Copy the Link", "Show me my week"
  appleButton: '#2C3E2F', // "Apple Calendar" button
  outlineBorder: '#C7C7C4', // "Google Calendar" button border
  rowBorder: '#E4E4E0', // Rows on "You're all set"
  inactiveDot: '#CFD6CB', // Page indicator dots that aren't the current step
  iconCircle: '#D2DFCE', // Circles behind feature icons and check marks
  iconGreen: '#537257', // Row icons and the "done" circle on "You're all set"
} as const;

/**
 * Colors from the Home Figma screen that aren't part of the final palette.
 * Confirm with the designer before using them outside Home.
 */
export const homeColors = {
  helpGold: '#F0B626', // "Help" on the Weekly Forecast card
} as const;

/**
 * Priority pills on assignments (#86). High is based on the Figma "High
 * Priority" pill (#F9E0DD / #B85F55), shifted toward orange so Overdue can be
 * the darker red. Confirm with the designer.
 */
export const priorityColors = {
  overdueText: '#8E2F28',
  overdueBackground: '#F2D2CE',
  highText: '#C0532E',
  highBackground: '#FBE3D7',
  mediumText: '#8A6A00',
  mediumBackground: '#FFF1B8', // paleSun
  noDueDateText: '#758078', // mutedGrayGreen
  noDueDateBackground: '#ECEEEA',
} as const;
