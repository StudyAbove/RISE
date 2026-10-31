import { colors } from '../../../theme/colors';
import { getWorkloadBadgeColor } from '../components/SectionHeader';

describe('getWorkloadBadgeColor', () => {
  it('is light green for 0 to 2 assignments', () => {
    expect(getWorkloadBadgeColor(0)).toBe(colors.mistGreen);
    expect(getWorkloadBadgeColor(2)).toBe(colors.mistGreen);
  });

  it('is yellow for 3 to 5', () => {
    expect(getWorkloadBadgeColor(3)).toBe(colors.paleSun);
    expect(getWorkloadBadgeColor(5)).toBe(colors.paleSun);
  });

  it('is a deeper yellow for 6 or more', () => {
    expect(getWorkloadBadgeColor(6)).toBe(colors.butterYellow);
  });
});
