import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

import { colors } from '../../../theme/colors';

// Shape of an SVG imported from assets/icons/navigation (see src/types/svg.d.ts).
type NavIconComponent = FC<SvgProps & { fillColor?: string }>;

export interface TabBarIconSource {
  /** Shown when the tab is selected. */
  Filled: NavIconComponent;
  /** Shown when the tab is not selected. */
  Outline: NavIconComponent;
  width: number;
  height: number;
}

interface TabBarIconProps {
  icon: TabBarIconSource;
  focused: boolean;
  color: string;
}

/** Shows the filled or outline version of a tab's icon depending on whether it's selected. */
export function TabBarIcon({ icon, focused, color }: TabBarIconProps) {
  const Icon = focused ? icon.Filled : icon.Outline;

  // Filled icons are white inside so they stand out against the sage highlight.
  return (
    <Icon width={icon.width} height={icon.height} color={color} fillColor={colors.softWhite} />
  );
}
