export interface AcademicTermRange {
  start: Date;
  end: Date;
  currentTerm:
    | 'spring'
    | 'summer'
    | 'fall';
}

/**
 * Returns the active calendar sync window for RISE.
 *
 * Spring:
 * January 1 through July 31
 *
 * Summer:
 * June 1 through December 31
 *
 * Fall:
 * August 1 through May 31 of the following year
 *
 * This gives students the full current term plus the next term.
 */
export function getAcademicTermRange(
  date: Date = new Date(),
): AcademicTermRange {
  const year =
    date.getFullYear();

  const month =
    date.getMonth();

  // January through May
  if (month >= 0 && month <= 4) {
    return {
      currentTerm:
        'spring',

      start:
        new Date(
          year,
          0,
          1,
          0,
          0,
          0,
          0,
        ),

      end:
        new Date(
          year,
          7,
          1,
          0,
          0,
          0,
          0,
        ),
    };
  }

  // June through July
  if (month >= 5 && month <= 6) {
    return {
      currentTerm:
        'summer',

      start:
        new Date(
          year,
          5,
          1,
          0,
          0,
          0,
          0,
        ),

      end:
        new Date(
          year + 1,
          0,
          1,
          0,
          0,
          0,
          0,
        ),
    };
  }

  // August through December
  return {
    currentTerm:
      'fall',

    start:
      new Date(
        year,
        7,
        1,
        0,
        0,
        0,
        0,
      ),

    end:
      new Date(
        year + 1,
        5,
        1,
        0,
        0,
        0,
        0,
      ),
  };
}