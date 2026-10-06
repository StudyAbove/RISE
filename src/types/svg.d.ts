// Type declaration for SVG imports handled by react-native-svg-transformer
// (configured in metro.config.js).
declare module '*.svg' {
  import type { FC } from 'react';
  import type { SvgProps } from 'react-native-svg';

  const SvgComponent: FC<SvgProps>;
  export default SvgComponent;
}
