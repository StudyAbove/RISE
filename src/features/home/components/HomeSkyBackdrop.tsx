import { Image, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '../../../theme/colors';
import type { TimeOfDay } from '../utils/greeting';
import { styles } from './HomeSkyBackdrop.styles';

const SKY_IMAGES = {
  morning: require('../../../../assets/images/home/sky-morning.png'),
  afternoon: require('../../../../assets/images/home/sky-afternoon.png'),
  evening: require('../../../../assets/images/home/sky-evening.png'),
  night: require('../../../../assets/images/home/sky-night.png'),
} satisfies Record<TimeOfDay, number>;

// How far (in points) the picture spills past the right side of the screen.
const RIGHT_OVERFLOW = 30;

interface HomeSkyBackdropProps {
  timeOfDay: TimeOfDay;
  /** Y position (in the scroll content) where the bottom of the picture sits. */
  bottom: number;
}

/**
 * Decorative sun/moon-over-hills picture behind the top of the Home page.
 * Must be the first child of the scroll content so it sits under the header.
 */
export function HomeSkyBackdrop({ timeOfDay, bottom }: HomeSkyBackdropProps) {
  const { width: screenWidth } = useWindowDimensions();
  const source = SKY_IMAGES[timeOfDay];

  // Starts at the left edge and runs past the right edge, keeping the
  // picture's own proportions so it is never stretched.
  const image = Image.resolveAssetSource(source);
  const width = screenWidth + RIGHT_OVERFLOW;
  const height = width * (image.height / image.width);
  const size = { left: 0, top: bottom - height, width, height };

  return (
    <View pointerEvents="none" style={[styles.container, size]}>
      <Image source={source} style={styles.image} />

      {/* Fades the bottom of the hills into the page background, like the
          blurred cream ellipses in the Figma. */}
      <Svg style={styles.fade} width="100%" height="100%">
        <Defs>
          <LinearGradient id="skyFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.6" stopColor={colors.warmCream} stopOpacity={0} />
            <Stop offset="1" stopColor={colors.warmCream} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#skyFade)" />
      </Svg>
    </View>
  );
}
