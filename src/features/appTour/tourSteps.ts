import type { MainTabParamList } from '../navigation/types';

export type TourStep = {
  tab: keyof MainTabParamList;
  title: string;
  description: string;
};

export const TOUR_STEPS: readonly TourStep[] = [
  {
    tab: 'Home',
    title: 'Your day at a glance',
    description: 'See upcoming work and choose what to study next.',
  },
  {
    tab: 'Calendar',
    title: 'See your schedule',
    description: 'Keep classes, deadlines, and plans in one place.',
  },
  {
    tab: 'Study',
    title: 'One task at a time',
    description:
      'Break assignments into smaller tasks and start a focused study session.',
  },
  {
    tab: 'List',
    title: 'Find your assignments',
    description: 'All your assignments, organized in one place.',
  },
  {
    tab: 'Analytics',
    title: 'Notice your habits',
    description: 'Explore your study activity and break habits over time.',
  },
];