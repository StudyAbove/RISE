import { Animated, View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { colors } from '../../../theme/colors';
import { SUN_FULL_BREATH_SCALE } from '../utils/breathingSession';
import { SCENE_ASPECT_RATIO, styles } from './BreathingScene.styles';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// The scene is drawn in a fixed 304 × 260 space (the approved breathing
// design) and scaled to fit the screen, so these numbers never change.
const SCENE_WIDTH = 304;
const SCENE_HEIGHT = SCENE_WIDTH / SCENE_ASPECT_RATIO;
const SUN_X = SCENE_WIDTH / 2;
// At rest only a small cap of the sun peeks over the valley between the hills.
const SUN_REST_Y = 236;
const SUN_RISEN_Y = 81;
const SUN_RADIUS = 42.5;
// The soft halo reaches 2.4 times past the sun's edge.
const GLOW_RADIUS = SUN_RADIUS * 2.4;

// Where the hills art sits. The image file is already cropped to just this
// part (no empty sky, nothing below the window) to keep it small in memory.
const HILLS = { y: 167.94, height: 92.09 };

// The top edge of the hills, left to right, traced from the art's opaque
// pixels. If the hills art changes, trace this again.
const RIDGE: [x: number, y: number][] = [
  [0, 182.1], [8, 180.5], [16, 178.1], [24, 176.5], [32, 177.4], [40, 180.5],
  [48, 182.3], [56, 180.8], [64, 181.7], [72, 184.1], [80, 185.4], [88, 187.7],
  [96, 190.1], [104, 191.9], [112, 195.7], [120, 198.5], [128, 200.5], [136, 202.6],
  [144, 203.9], [152, 201.5], [160, 199.5], [168, 197.4], [176, 195.6], [184, 194.5],
  [192, 194.3], [200, 191.4], [208, 189.6], [216, 189.0], [224, 186.8], [232, 184.7],
  [240, 183.9], [248, 183.7], [256, 179.9], [264, 177.4], [272, 176.7], [280, 178.7],
  [288, 181.0], [296, 182.1], [304, 183.4],
];

// The sky above the ridge. The sun and its glow are clipped to it, so no light
// shows through the hills' soft edge. This only clips; it never paints.
const SKY_OUTLINE = `M0 0 H${SCENE_WIDTH} ${[...RIDGE]
  .reverse()
  .map(([x, y]) => `L${x} ${y}`)
  .join(' ')} Z`;

// Sun shades from the approved design. The middle two are RISE's paleSun and
// butterYellow; the lightest and darkest only appear in the sun.
const SUN_COLORS = {
  center: '#FFF9DD',
  edge: '#EBC86A',
} as const;

type BreathingSceneProps = {
  /** 0 resting behind the hills, 1 fully risen. */
  sunRise: Animated.Value;
  /** 1 resting, up to SUN_FULL_BREATH_SCALE at the top of a breath. */
  sunScale: Animated.Value;
  /**
   * With Reduce Motion on, the sun stays still in the sky and only its glow
   * brightens and softens with each breath.
   */
  reduceMotion: boolean;
};

/** The watercolor hills with a sun that rises and breathes (#71). */
export function BreathingScene({ sunRise, sunScale, reduceMotion }: BreathingSceneProps) {
  const sunY = reduceMotion
    ? SUN_RISEN_Y
    : sunRise.interpolate({ inputRange: [0, 1], outputRange: [SUN_REST_Y, SUN_RISEN_Y] });
  const sunRadius = reduceMotion ? SUN_RADIUS : Animated.multiply(sunScale, SUN_RADIUS);
  const glowRadius = reduceMotion ? GLOW_RADIUS : Animated.multiply(sunScale, GLOW_RADIUS);
  const glowOpacity = reduceMotion
    ? sunScale.interpolate({ inputRange: [1, SUN_FULL_BREATH_SCALE], outputRange: [0.5, 1] })
    : 1;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="A sun rising and breathing above watercolor hills"
      style={styles.window}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}>
        <Defs>
          <ClipPath id="sky">
            <Path d={SKY_OUTLINE} />
          </ClipPath>
          {/* Clear in the middle (the sun covers it), fading out at the edge. */}
          <RadialGradient id="sunGlow">
            <Stop offset="0.27" stopColor={colors.paleSun} stopOpacity={0.85} />
            <Stop offset="0.6" stopColor={colors.butterYellow} stopOpacity={0.32} />
            <Stop offset="1" stopColor={colors.butterYellow} stopOpacity={0} />
          </RadialGradient>
          {/* Lit from slightly up and to the left. */}
          <RadialGradient id="sunDisk" fx="0.45" fy="0.425">
            <Stop offset="0" stopColor={SUN_COLORS.center} />
            <Stop offset="0.36" stopColor={colors.paleSun} />
            <Stop offset="0.78" stopColor={colors.butterYellow} />
            <Stop offset="1" stopColor={SUN_COLORS.edge} />
          </RadialGradient>
        </Defs>

        <Rect width={SCENE_WIDTH} height={SCENE_HEIGHT} fill={colors.warmCream} />

        <G clipPath="url(#sky)">
          <AnimatedCircle cx={SUN_X} cy={sunY} r={glowRadius} fill="url(#sunGlow)" opacity={glowOpacity} />
          <AnimatedCircle cx={SUN_X} cy={sunY} r={sunRadius} fill="url(#sunDisk)" />
        </G>

        <SvgImage
          href={require('../../../../assets/images/help/breathing-hills.png')}
          x={0}
          y={HILLS.y}
          width={SCENE_WIDTH}
          height={HILLS.height}
          preserveAspectRatio="none"
        />
      </Svg>
    </View>
  );
}
