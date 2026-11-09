import HydrateIcon from '../../../../assets/icons/breaks/hydrate.svg';
import StretchIcon from '../../../../assets/icons/breaks/stretch.svg';
import WalkIcon from '../../../../assets/icons/breaks/walk.svg';

import type {
  BreakType,
} from '../types';

/*
 * Full catalog of break types available to RISE.
 *
 * The Take a Break screen always receives three recommended
 * options, but this catalog can grow beyond three items later.
 */
export const BREAK_CATALOG: BreakType[] = [
  {
    id: 'stretch',
    label: 'Stretch',
    icon: StretchIcon,
    iconWidth: 20,
    iconHeight: 22,
    image: require('../../../../assets/images/breaks/stretch.png'),
    title: 'Stretching - Helps',
    bestFor:
      'Choose this when you have been sitting for a while and want a quick physical reset without taking a long break from studying.',
    durationLabel: '10–15 min',
    durationMinutes: 15,
    benefit:
      'Gentle stretching gives your body a chance to move and loosen up while giving your mind a short pause before you get back to work.',
  },
  {
    id: 'hydrate',
    label: 'Hydrate',
    icon: HydrateIcon,
    iconWidth: 13.75,
    iconHeight: 21,
    image: require('../../../../assets/images/breaks/hydrate.png'),
    title: 'Hydrating - Helps',
    bestFor:
      'Choose this when you want a very quick break between tasks without interrupting your study session for too long.',
    durationLabel: '2–5 min',
    durationMinutes: 5,
    benefit:
      'Getting up for a drink gives you a simple reason to step away from your screen and take a brief reset before continuing.',
  },
  {
    id: 'walk',
    label: 'Walk',
    icon: WalkIcon,
    iconWidth: 18,
    iconHeight: 21.25,
    image: require('../../../../assets/images/breaks/walk.png'),
    title: 'Walking - Helps',
    bestFor:
      'Choose this when you feel restless, stuck on a problem, or need to step away from your study space for a moment.',
    durationLabel: '10–15 min',
    durationMinutes: 15,
    benefit:
      'A short walk gets you moving and gives your mind a change of environment so you can return to your work feeling refreshed.',
  },
];
