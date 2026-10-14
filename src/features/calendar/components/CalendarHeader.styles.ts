import { StyleSheet } from 'react-native';

import { fonts } from '../../../theme/typography';
import { calendarColors } from '../calendarColors';

// Banner size from Figma. It is wider than the 393pt frame, so it bleeds off both edges.
const HERO_WIDTH = 467;
const HERO_HEIGHT = 148.4;
const FIGMA_FRAME_WIDTH = 393;

const BACKDROP_WIDTH = 252;
const BACKDROP_HEIGHT = 82;
const PERIOD_ROW_HEIGHT = 28;

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
  },
  hero: {
    position: 'absolute',
    top: -3,
    left: '-7.4%',
    width: `${(HERO_WIDTH / FIGMA_FRAME_WIDTH) * 100}%`,
    aspectRatio: HERO_WIDTH / HERO_HEIGHT,
    opacity: 0.8,
  },
  actionRow: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 6,
  },
  trailingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  iconBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodRow: {
    height: PERIOD_ROW_HEIGHT,
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  labelBackdrop: {
    position: 'absolute',
    top: (PERIOD_ROW_HEIGHT - BACKDROP_HEIGHT) / 2,
    left: '50%',
    marginLeft: -BACKDROP_WIDTH / 2,
  },
  arrowButton: {
    paddingHorizontal: 1,
  },
  flipped: {
    transform: [{ scaleX: -1 }],
  },
  periodLabel: {
    fontFamily: fonts.heading.extraBold,
    fontSize: 20,
    color: calendarColors.labelText,
  },
});
