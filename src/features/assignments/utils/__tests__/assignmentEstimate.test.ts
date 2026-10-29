import {
  formatEstimate,
  getAssignmentEstimate,
  guessAssignmentKind,
  guessAssignmentMinutes,
} from '../assignmentEstimate';

describe('guessAssignmentKind', () => {
  it.each([
    ['Midterm Exam', 'exam'],
    ['Final', 'exam'],
    ['Final Project', 'project'],
    ['Milestone #4', 'project'],
    ['Osmosis Lab Report', 'lab'],
    ['Reflection Essay', 'paper'],
    ['Problem Set #5', 'homework'],
    ['Quiz 3', 'quiz'],
    ['Week 4 Discussion Post', 'discussion'],
    ['Read Chapter 6', 'reading'],
    ['Office hours sign-up', 'other'],
  ])('reads "%s" as %s', (title, kind) => {
    expect(guessAssignmentKind(title)).toBe(kind);
  });
});

describe('guessAssignmentMinutes', () => {
  it('gives each kind a typical time', () => {
    expect(guessAssignmentMinutes('exam', null)).toBe(240);
    expect(guessAssignmentMinutes('discussion', null)).toBe(30);
  });

  it('takes longer for high-point work and less for low-point work', () => {
    expect(guessAssignmentMinutes('homework', 100)).toBe(135);
    expect(guessAssignmentMinutes('homework', 5)).toBe(45);
  });
});

describe('getAssignmentEstimate', () => {
  it('uses the saved estimate when there is one', () => {
    expect(
      getAssignmentEstimate({
        title: 'Problem Set #5',
        pointsPossible: 20,
        estimatedMinutes: 45,
        kind: 'homework',
      }),
    ).toEqual({ minutes: 45, kind: 'homework', isGuess: false });
  });

  it('guesses from the title and points until one is saved', () => {
    expect(
      getAssignmentEstimate({
        title: 'Midterm Exam',
        pointsPossible: 100,
        estimatedMinutes: null,
        kind: null,
      }),
    ).toEqual({ minutes: 360, kind: 'exam', isGuess: true });
  });
});

describe('formatEstimate', () => {
  it.each([
    [45, '45m'],
    [60, '1h'],
    [80, '1h 20m'],
    [150, '2h 30m'],
  ])('formats %i minutes as %s', (minutes, label) => {
    expect(formatEstimate(minutes)).toBe(label);
  });
});
