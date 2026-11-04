import { removeCourseCodeSection, removeCourseSection } from '../utils/courseNames';

describe('removeCourseSection', () => {
  it.each([
    ['CECS 491B SEC 01 Senior Project I', 'CECS 491B Senior Project I'],
    ['CECS 491B - SEC 01', 'CECS 491B'],
    ['BIOL 200 Sec01: Cell Biology', 'BIOL 200: Cell Biology'],
    ['EE 381 Section 05', 'EE 381'],
    ['MATH 122 Sec. 2', 'MATH 122'],
    ['ENGL 100 (SEC 03)', 'ENGL 100'],
    ['CECS 274 SEC 01/02 Data Structures', 'CECS 274 Data Structures'],
  ])('turns "%s" into "%s"', (name, cleaned) => {
    expect(removeCourseSection(name)).toBe(cleaned);
  });

  it.each(['Secure Software Design', 'Section Leader Training', 'Cell Biology'])(
    'leaves "%s" alone',
    (name) => {
      expect(removeCourseSection(name)).toBe(name);
    },
  );
});

describe('removeCourseCodeSection', () => {
  it.each([
    ['CECS 491B SEC 01', 'CECS 491B'],
    ['CECS 491B-SEC01', 'CECS 491B'],
    ['ENGL 100-02', 'ENGL 100'],
    ['EE 381', 'EE 381'],
  ])('turns "%s" into "%s"', (code, cleaned) => {
    expect(removeCourseCodeSection(code)).toBe(cleaned);
  });
});
