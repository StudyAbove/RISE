import { formatStudyTime } from '../utils/studyTime';

describe('formatStudyTime (#49)', () => {
  it.each([
    [0, '0m'],
    [59, '0m'],
    [60, '1m'],
    [45 * 60 + 30, '45m'],
    [3600, '1h'],
    [12 * 3600 + 30 * 60, '12h 30m'],
    [-5, '0m'],
  ])('shows %s seconds as %s', (seconds, label) => {
    expect(formatStudyTime(seconds)).toBe(label);
  });
});
