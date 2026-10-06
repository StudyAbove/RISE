import type { ComponentType } from 'react';

import AnalyticsFilledIcon from '../../../../assets/icons/navigation/analytics-filled.svg';
import AnalyticsOutlineIcon from '../../../../assets/icons/navigation/analytics-outline.svg';
import CalendarFilledIcon from '../../../../assets/icons/navigation/calendar-filled.svg';
import CalendarOutlineIcon from '../../../../assets/icons/navigation/calendar-outline.svg';
import HomeFilledIcon from '../../../../assets/icons/navigation/home-filled.svg';
import HomeOutlineIcon from '../../../../assets/icons/navigation/home-outline.svg';
import ListFilledIcon from '../../../../assets/icons/navigation/list-filled.svg';
import ListOutlineIcon from '../../../../assets/icons/navigation/list-outline.svg';
import StudyFilledIcon from '../../../../assets/icons/navigation/study-filled.svg';
import StudyOutlineIcon from '../../../../assets/icons/navigation/study-outline.svg';
import { AnalyticsScreen } from '../../analytics/screens/AnalyticsScreen';
import { AssignmentsScreen } from '../../assignments/screens/AssignmentsScreen';
import { CalendarScreen } from '../../calendar/screens/CalendarScreen';
import { HomeScreen } from '../../home/screens/HomeScreen';
import { StudyScreen } from '../../studyPlan/screens/StudyScreen';
import type { TabBarIconSource } from '../components/TabBarIcon';
import type { MainTabParamList } from '../types';

export interface MainTabConfig {
  name: keyof MainTabParamList;
  /** Short text shown under the icon and read by VoiceOver. */
  label: string;
  component: ComponentType;
  icon: TabBarIconSource;
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
    icon: { Filled: HomeFilledIcon, Outline: HomeOutlineIcon, ...STANDARD_ICON_SIZE },
  },
  {
    name: 'Calendar',
    label: 'Calendar',
    component: CalendarScreen,
    icon: { Filled: CalendarFilledIcon, Outline: CalendarOutlineIcon, ...CALENDAR_ICON_SIZE },
  },
  {
    name: 'Study',
    label: 'Study',
    component: StudyScreen,
    icon: { Filled: StudyFilledIcon, Outline: StudyOutlineIcon, ...STANDARD_ICON_SIZE },
  },
  {
    name: 'List',
    label: 'List',
    component: AssignmentsScreen,
    icon: { Filled: ListFilledIcon, Outline: ListOutlineIcon, ...STANDARD_ICON_SIZE },
  },
  {
    name: 'Analytics',
    label: 'Analytics',
    component: AnalyticsScreen,
    icon: { Filled: AnalyticsFilledIcon, Outline: AnalyticsOutlineIcon, ...STANDARD_ICON_SIZE },
  },
];
