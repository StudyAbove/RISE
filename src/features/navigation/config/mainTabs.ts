import type { ComponentType, FC } from 'react';
import type { SvgProps } from 'react-native-svg';

import AnalyticsIcon from '../../../../assets/icons/navigation/analytics-outline.svg';
import CalendarIcon from '../../../../assets/icons/navigation/calendar-outline.svg';
import HomeIcon from '../../../../assets/icons/navigation/home-outline.svg';
import ListIcon from '../../../../assets/icons/navigation/list-outline.svg';
import StudyIcon from '../../../../assets/icons/navigation/study-outline.svg';
import { AnalyticsScreen } from '../../analytics/screens/AnalyticsScreen';
import { AssignmentsScreen } from '../../assignments/screens/AssignmentsScreen';
import { CalendarScreen } from '../../calendar/screens/CalendarScreen';
import { HomeScreen } from '../../home/screens/HomeScreen';
import { StudyScreen } from '../../studyPlan/screens/StudyScreen';
import type { MainTabParamList } from '../types';

export interface MainTabConfig {
  name: keyof MainTabParamList;
  /** Short text shown under the icon and read by VoiceOver. */
  label: string;
  component: ComponentType;
  icon: { Icon: FC<SvgProps>; width: number; height: number };
}

// Icon sizes match the Figma "Final - Bar" component.
const STANDARD_ICON_SIZE = { width: 35, height: 35 };
const CALENDAR_ICON_SIZE = { width: 40, height: 35 };

/**
 * The tabs in the bottom nav bar, in display order.
 * This is the single place to add, remove, or reorder main pages.
 */
export const MAIN_TABS: MainTabConfig[] = [
  {
    name: 'Home',
    label: 'Home',
    component: HomeScreen,
    icon: { Icon: HomeIcon, ...STANDARD_ICON_SIZE },
  },
  {
    name: 'Calendar',
    label: 'Calendar',
    component: CalendarScreen,
    icon: { Icon: CalendarIcon, ...CALENDAR_ICON_SIZE },
  },
  {
    name: 'Study',
    label: 'Study',
    component: StudyScreen,
    icon: { Icon: StudyIcon, ...STANDARD_ICON_SIZE },
  },
  {
    name: 'Assignments',
    label: 'Assignments',
    component: AssignmentsScreen,
    icon: { Icon: ListIcon, ...STANDARD_ICON_SIZE },
  },
  {
    name: 'Analytics',
    label: 'Analytics',
    component: AnalyticsScreen,
    icon: { Icon: AnalyticsIcon, ...STANDARD_ICON_SIZE },
  },
];
