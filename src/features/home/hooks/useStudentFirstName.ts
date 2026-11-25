import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { fetchCurrentDisplayName } from '../../../repositories/profileRepository';

import { getFirstName } from '../utils/greeting';

/**
 * The signed-in student's first name, or null while loading, when signed
 * out, or if the profile can't be read. Callers should still render without it.
 *
 * Refresh whenever Home becomes active so changes made in Account Settings
 * are reflected without requiring the app to restart.
 */
export function useStudentFirstName(): string | null {
  const [firstName, setFirstName] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      fetchCurrentDisplayName()
        .then((displayName) => {
          if (isActive) {
            setFirstName(
              getFirstName(displayName),
            );
          }
        })
        .catch((error: Error) => {
          console.warn(
            'Could not load the student name:',
            error.message,
          );
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  return firstName;
}
