import * as Calendar from 'expo-calendar';

export type AppleCalendarAccess =
  | 'full'
  | 'write-only'
  | 'denied';

export async function getAppleCalendarAccess(): Promise<AppleCalendarAccess> {
  const fullAccess =
    await Calendar.getCalendarPermissions(false);

  if (fullAccess.status === 'granted') {
    return 'full';
  }

  const writeOnlyAccess =
    await Calendar.getCalendarPermissions(true);

  if (writeOnlyAccess.status === 'granted') {
    return 'write-only';
  }

  return 'denied';
}

export async function requestAppleCalendarFullAccess() {
  return Calendar.requestCalendarPermissions(false);
}