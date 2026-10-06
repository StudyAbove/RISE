import type { TextStyle } from 'react-native';

import type { fontAssets } from './fontAssets';

/**
 * Font family names. Each weight is its own family in React Native, so pick
 * the weight here instead of setting `fontWeight` (which breaks custom fonts on iOS).
 */
export const fonts = {
  // Headings and big messages
  heading: {
    extraLight: 'NunitoSans_200ExtraLight',
    light: 'NunitoSans_300Light',
    regular: 'NunitoSans_400Regular',
    medium: 'NunitoSans_500Medium',
    semiBold: 'NunitoSans_600SemiBold',
    bold: 'NunitoSans_700Bold',
    extraBold: 'NunitoSans_800ExtraBold',
    black: 'NunitoSans_900Black',
  },
  // Regular text and functional information
  body: {
    thin: 'Inter_100Thin',
    light: 'Inter_300Light',
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extraBold: 'Inter_800ExtraBold',
    black: 'Inter_900Black',
  },
} as const satisfies Record<string, Record<string, keyof typeof fontAssets>>;

/** Text styles that repeat across the Figma screens. */
export const textStyles = {
  // Page titles, e.g. "Analytics"
  screenHeading: { fontFamily: fonts.heading.bold, fontSize: 24 },
  // Section titles, e.g. "High Priority Tasks"
  sectionTitle: { fontFamily: fonts.heading.bold, fontSize: 18 },
  // Item titles inside cards, e.g. "Problem Set #5"
  cardTitle: { fontFamily: fonts.heading.semiBold, fontSize: 13 },
  body: { fontFamily: fonts.body.regular, fontSize: 14 },
  // Text under a screen heading, e.g. "Your progress tells a bigger story."
  subtitle: { fontFamily: fonts.body.regular, fontSize: 12 },
  // Secondary details, e.g. a course code under a card title
  caption: { fontFamily: fonts.body.regular, fontSize: 11 },
  // Small labels, e.g. "Due Fri, Nov 13"
  tinyLabel: { fontFamily: fonts.body.medium, fontSize: 10 },
  // "View all" style links (add textDecorationLine: 'underline' where shown)
  link: { fontFamily: fonts.body.medium, fontSize: 13 },
  // Focus session countdown
  timer: { fontFamily: fonts.body.semiBold, fontSize: 50, letterSpacing: 5 },
} satisfies Record<string, TextStyle>;
