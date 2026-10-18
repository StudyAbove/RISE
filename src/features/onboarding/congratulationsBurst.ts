import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';

import HeartOne from '../../../assets/images/onboarding/congratulations/heart-1.svg';
import HeartTwo from '../../../assets/images/onboarding/congratulations/heart-2.svg';
import HeartThree from '../../../assets/images/onboarding/congratulations/heart-3.svg';
import HeartFour from '../../../assets/images/onboarding/congratulations/heart-4.svg';
import OrangeStarOne from '../../../assets/images/onboarding/congratulations/orange-star-1.svg';
import OrangeStarTwo from '../../../assets/images/onboarding/congratulations/orange-star-2.svg';
import OrangeStarThree from '../../../assets/images/onboarding/congratulations/orange-star-3.svg';
import OrangeStarFour from '../../../assets/images/onboarding/congratulations/orange-star-4.svg';
import SparkOne from '../../../assets/images/onboarding/congratulations/spark-1.svg';
import SparkTwo from '../../../assets/images/onboarding/congratulations/spark-2.svg';
import SparkThree from '../../../assets/images/onboarding/congratulations/spark-3.svg';
import SparkFour from '../../../assets/images/onboarding/congratulations/spark-4.svg';
import SparkFive from '../../../assets/images/onboarding/congratulations/spark-5.svg';
import SparkSix from '../../../assets/images/onboarding/congratulations/spark-6.svg';
import YellowStarOne from '../../../assets/images/onboarding/congratulations/yellow-star-1.svg';
import YellowStarTwo from '../../../assets/images/onboarding/congratulations/yellow-star-2.svg';
import YellowStarThree from '../../../assets/images/onboarding/congratulations/yellow-star-3.svg';
import YellowStarFour from '../../../assets/images/onboarding/congratulations/yellow-star-4.svg';

type Point = { x: number; y: number };

export type BurstPiece = {
  Icon: ComponentType<SvgProps>;
  width: number;
  height: number;
  /** Where the piece starts, as a point with no size. */
  start: Point;
  /** Center of the piece once it has burst out. */
  end: Point;
  /** Center of the piece as it fades away. */
  fade: Point;
};

/**
 * The stars, hearts and sparks around "Congratulations!", copied from the
 * Thanks → Explode → Reset states of Figma's "Slider Button with Cheer"
 * component. Positions are in the 300 × 56 box that holds the text.
 */
export const BURST_PIECES: BurstPiece[] = [
  { Icon: HeartOne, width: 15, height: 16, start: { x: 269.6, y: 10.9 }, end: { x: 296.6, y: -19.4 }, fade: { x: 292.6, y: -19.4 } },
  { Icon: HeartTwo, width: 9, height: 10, start: { x: 268.5, y: 8.7 }, end: { x: 274, y: -10.6 }, fade: { x: 274, y: -8.6 } },
  { Icon: HeartThree, width: 14, height: 16, start: { x: 244.5, y: 10.4 }, end: { x: 272.6, y: -37.3 }, fade: { x: 272.6, y: -37.3 } },
  { Icon: HeartFour, width: 26, height: 28, start: { x: 267.4, y: 10.5 }, end: { x: 304.8, y: -53.2 }, fade: { x: 300.5, y: -51.7 } },
  { Icon: OrangeStarOne, width: 7, height: 7, start: { x: 58.2, y: 44.4 }, end: { x: 35.8, y: 70.1 }, fade: { x: 34.8, y: 63.1 } },
  { Icon: OrangeStarTwo, width: 18, height: 19, start: { x: 35.9, y: 20.4 }, end: { x: 16.7, y: 81.4 }, fade: { x: 16.7, y: 80.4 } },
  { Icon: OrangeStarThree, width: 21, height: 23, start: { x: 18.4, y: 28.6 }, end: { x: -8.2, y: 58.9 }, fade: { x: -4.2, y: 56.9 } },
  { Icon: OrangeStarFour, width: 23, height: 26, start: { x: 25.2, y: 22.5 }, end: { x: -14.9, y: 95.3 }, fade: { x: -11.8, y: 90.3 } },
  { Icon: SparkOne, width: 6, height: 14, start: { x: 119.5, y: 37.7 }, end: { x: 122.1, y: 94.5 }, fade: { x: 122.1, y: 84.5 } },
  { Icon: SparkTwo, width: 11, height: 12, start: { x: 115.4, y: 33.7 }, end: { x: 141, y: 86.4 }, fade: { x: 140, y: 76.4 } },
  { Icon: SparkThree, width: 11, height: 12, start: { x: 110.9, y: 53.2 }, end: { x: 103.2, y: 86.4 }, fade: { x: 104.2, y: 76.4 } },
  { Icon: SparkFour, width: 6, height: 14, start: { x: 180.3, y: 22.1 }, end: { x: 177.7, y: -34.6 }, fade: { x: 177.7, y: -24.6 } },
  { Icon: SparkFive, width: 11, height: 12, start: { x: 184.5, y: 16.2 }, end: { x: 158.9, y: -26.6 }, fade: { x: 159.9, y: -16.6 } },
  { Icon: SparkSix, width: 11, height: 12, start: { x: 188.9, y: 6.6 }, end: { x: 196.5, y: -26.6 }, fade: { x: 195.5, y: -16.6 } },
  { Icon: YellowStarOne, width: 20, height: 22, start: { x: 20, y: 15.2 }, end: { x: 33.4, y: -27 }, fade: { x: 33.4, y: -28 } },
  { Icon: YellowStarTwo, width: 8, height: 9, start: { x: 57.3, y: 15.5 }, end: { x: 60.1, y: -15.4 }, fade: { x: 59.1, y: -18.4 } },
  { Icon: YellowStarThree, width: 12, height: 13, start: { x: 230.2, y: 36.2 }, end: { x: 240, y: 75 }, fade: { x: 240, y: 75 } },
  { Icon: YellowStarFour, width: 6, height: 7, start: { x: 276.5, y: 31.9 }, end: { x: 270, y: 64.6 }, fade: { x: 280, y: 69.6 } },
];
