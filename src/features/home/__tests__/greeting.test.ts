import { formatLongDate, getFirstName, getTimeOfDayGreeting } from '../utils/greeting';

// November 13, 2026 at the given local hour and minute.
function atTime(hour: number, minute = 0) {
  return new Date(2026, 10, 13, hour, minute);
}

describe('getTimeOfDayGreeting', () => {
  it.each([
    [5, 0, 'Good morning'],
    [11, 59, 'Good morning'],
    [12, 0, 'Good afternoon'],
    [16, 59, 'Good afternoon'],
    [17, 0, 'Good evening'],
    [23, 59, 'Good evening'],
    [2, 0, 'Good evening'],
  ])('says the right greeting at %i:%i', (hour, minute, expected) => {
    expect(getTimeOfDayGreeting(atTime(hour, minute))).toBe(expected);
  });
});

describe('formatLongDate', () => {
  it('formats the date like the Figma design', () => {
    expect(formatLongDate(atTime(9))).toBe('Friday, November 13, 2026');
  });
});

describe('getFirstName', () => {
  it.each([
    ['Fahd Ahmed', 'Fahd'],
    ['  Fahd  ', 'Fahd'],
    ['', null],
    [null, null],
    [undefined, null],
  ])('turns %p into %p', (displayName, expected) => {
    expect(getFirstName(displayName)).toBe(expected);
  });
});
