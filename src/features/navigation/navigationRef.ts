import {
  createNavigationContainerRef,
} from '@react-navigation/native';

import type {
  RootStackParamList,
} from './types';

/**
 * Shared root navigation ref for app-level events that happen
 * outside React Navigation screens, such as tapping a system
 * notification (#30).
 */
export const navigationRef =
  createNavigationContainerRef<
    RootStackParamList
  >();
