import { useEffect, useState } from 'react';

import { fetchCurrentDisplayName } from '../../../repositories/profileRepository';
import { getFirstName } from '../utils/greeting';

/**
 * The signed-in student's first name, or null while loading, when signed
 * out, or if the profile can't be read. Callers should still render without it.
 */
export function useStudentFirstName(): string | null {
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchCurrentDisplayName()
      .then((displayName) => {
        if (isMounted) {
          setFirstName(getFirstName(displayName));
        }
      })
      .catch((error: Error) => {
        // Not worth blocking Home over; the greeting just leaves out the name.
        console.warn('Could not load the student name:', error.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return firstName;
}
