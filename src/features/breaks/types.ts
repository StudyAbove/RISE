import type {
  ComponentType,
} from 'react';

import type {
  ImageSourcePropType,
} from 'react-native';

import type {
  SvgProps,
} from 'react-native-svg';

export type BreakType = {
  id: string;
  label: string;
  icon: ComponentType<SvgProps>;
  iconWidth: number;
  iconHeight: number;
  image: ImageSourcePropType | null;
  title: string;
  bestFor: string;
  durationLabel: string;
  durationMinutes: number;
  benefit: string;
};
