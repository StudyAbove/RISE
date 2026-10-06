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
