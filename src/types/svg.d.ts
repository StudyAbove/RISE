// Type declaration for SVG imports handled by react-native-svg-transformer
// (configured in metro.config.js).
declare module '*.svg' {
  import type { FC } from 'react';
  import type { SvgProps } from 'react-native-svg';

  // `fillColor` is available on icons whose folder has a `.svgrrc` that maps
  // their hardcoded fill to this prop (see assets/icons/navigation/.svgrrc).
  const SvgComponent: FC<SvgProps & { fillColor?: string }>;
  export default SvgComponent;
}
