import { formatLastSynced, formatTimeLeft } from '../utils/formatLastSynced';

const NOW = new Date(2026, 10, 13, 12, 0, 0);

function minutesAgo(minutes: number) {
  return new Date(NOW.getTime() - minutes * 60 * 1000);
}

describe('formatLastSynced', () => {
  it.each([
    [0.5, 'Just now'],
    [12, '12 min ago'],
    [3 * 60, '3 hr ago'],
    [30 * 60, 'Yesterday'],
    [5 * 24 * 60, 'Nov 8'],
  ])('%p minutes ago reads %p', (minutes, expected) => {
    expect(formatLastSynced(minutesAgo(minutes), NOW)).toBe(expected);
  });
});

describe('formatTimeLeft', () => {
  it('counts down minutes and seconds', () => {
    expect(formatTimeLeft(new Date(NOW.getTime() + 545 * 1000), NOW)).toBe('9:05');
  });

  it('stops at zero once the code has expired', () => {
    expect(formatTimeLeft(minutesAgo(1), NOW)).toBe('0:00');
  });
});
