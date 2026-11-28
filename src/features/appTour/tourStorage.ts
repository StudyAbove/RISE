import Storage from 'expo-sqlite/kv-store';

export type TourChoice = 'started' | 'later' | 'skipped' | 'finished';

function storageKey(userId: string): string {
  if (!userId.trim()) {
    throw new Error('A signed-in account is required.');
  }

  return `rise:app-tour:v1:${userId}`;
}

/**
 * Each account has its own choice on this device.
 * Starting the tour also records that the invitation was answered.
 */
export async function readTourChoice(
  userId: string,
): Promise<TourChoice | null> {
  const value = await Storage.getItem(storageKey(userId));

  if (
    value === 'started' ||
    value === 'later' ||
    value === 'skipped' ||
    value === 'finished'
  ) {
    return value;
  }

  return null;
}

export async function saveTourChoice(
  userId: string,
  choice: TourChoice,
): Promise<void> {
  await Storage.setItem(storageKey(userId), choice);
}