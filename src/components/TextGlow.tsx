import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';

import { colors } from '../theme/colors';

interface TextGlowProps {
  /** Where the glow sits; usually absolute, a little bigger than the text. */
  style: StyleProp<ViewStyle>;
}

/**
 * A soft cream glow behind a page's title, so it stays readable over the sky
 * picture. Used on Home and the Study Plan, List and Analytics headers.
 */
export function TextGlow({ style }: TextGlowProps) {
  return (
    <View pointerEvents="none" style={style}>
      <Svg width="100%" height="100%">
        <Defs>
          {/* Cream that fades in above the text and out below it. */}
          <LinearGradient id="textScrimFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.warmCream} stopOpacity={0} />
            <Stop offset="0.35" stopColor={colors.warmCream} stopOpacity={0.6} />
            <Stop offset="0.65" stopColor={colors.warmCream} stopOpacity={0.6} />
            <Stop offset="1" stopColor={colors.warmCream} stopOpacity={0} />
          </LinearGradient>
          {/* Fades the glow out just past the end of the text. */}
          <LinearGradient id="textScrimEdge" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0.75" stopColor="white" stopOpacity={1} />
            <Stop offset="1" stopColor="white" stopOpacity={0} />
          </LinearGradient>
          <Mask id="textScrimMask">
            <Rect width="100%" height="100%" fill="url(#textScrimEdge)" />
          </Mask>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#textScrimFill)" mask="url(#textScrimMask)" />
      </Svg>
    </View>
  );
}
