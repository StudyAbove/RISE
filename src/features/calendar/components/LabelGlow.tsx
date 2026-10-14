import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '../../../theme/colors';

interface LabelGlowProps {
  width: number;
  height: number;
}

/**
 * Soft cream glow behind the month label so it stays readable over the banner.
 *
 * Figma draws this as a blurred ellipse, but its exported SVG is too small to
 * contain the blur, so the edges get cut off and show as a faint outline.
 * A radial gradient that reaches full transparency at its own edge fades
 * into the banner seamlessly instead.
 */
export function LabelGlow({ width, height }: LabelGlowProps) {
  return (
    <Svg width={width} height={height}>
      <Defs>
        <RadialGradient id="labelGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.warmCream} stopOpacity={1} />
          <Stop offset="0.45" stopColor={colors.warmCream} stopOpacity={0.9} />
          <Stop offset="0.75" stopColor={colors.warmCream} stopOpacity={0.45} />
          <Stop offset="1" stopColor={colors.warmCream} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill="url(#labelGlow)" />
    </Svg>
  );
}
