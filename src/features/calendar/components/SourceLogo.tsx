import { Image, type ImageSourcePropType, type ImageStyle, type StyleProp } from 'react-native';

import type { CalendarSource } from '../../../models/CalendarEvent';
import { styles } from './SourceLogo.styles';

// Each source's logo; RISE events use the app icon.
const SOURCE_LOGOS: Record<CalendarSource, ImageSourcePropType> = {
  rise: require('../../../../assets/icon.png'),
  google: require('../../../../assets/icons/google.png'),
  apple: require('../../../../assets/icons/apple.png'),
  canvas: require('../../../../assets/icons/canvas/canvas-logo.png'),
};

interface SourceLogoProps {
  source: CalendarSource;
  /** Width and height in points. */
  size: number;
  style?: StyleProp<ImageStyle>;
  testID?: string;
}

/**
 * The logo of where an event came from (#82), used on event chips, the today
 * card, the legend, and the details page. It's decoration: the text next to it,
 * or the event's VoiceOver label, names the source.
 */
export function SourceLogo({ source, size, style, testID }: SourceLogoProps) {
  return (
    <Image
      testID={testID}
      source={SOURCE_LOGOS[source]}
      resizeMode="contain"
      style={[{ width: size, height: size }, source === 'apple' && styles.appleLogo, style]}
      accessible={false}
      accessibilityIgnoresInvertColors
    />
  );
}
