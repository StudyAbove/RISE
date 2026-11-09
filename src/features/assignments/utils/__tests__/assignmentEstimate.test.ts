import {
  formatEstimate,
  getAssignmentEstimate,
  guessAssignmentKind,
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

describe('guessAssignmentKind with instructions', () => {
  it('reads the instructions when the title does not say', () => {
    expect(guessAssignmentKind('Week 6', 'Write a 3-page essay on osmosis.')).toBe('paper');
  });

  it('goes by the title when it does say', () => {
    expect(guessAssignmentKind('Quiz 2', 'Read chapter 4 first.')).toBe('quiz');
  });
});

describe('getAssignmentEstimate', () => {
  it('uses the saved estimate when there is one', () => {
    expect(
      getAssignmentEstimate({
        title: 'Problem Set #5',
        description: null,
        estimatedMinutes: 45,
        kind: 'homework',
      }),
    ).toEqual({ minutes: 45, kind: 'homework', isGuess: false });
  });

  it('guesses a typical time for its kind until one is saved', () => {
    expect(
      getAssignmentEstimate({
        title: 'Midterm Exam',
        description: null,
        estimatedMinutes: null,
        kind: null,
      }),
    ).toEqual({ minutes: 240, kind: 'exam', isGuess: true });
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
