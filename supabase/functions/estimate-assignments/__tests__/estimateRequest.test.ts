import { ASSIGNMENT_KINDS, buildEstimatePrompt, readEstimates } from '../estimateRequest';
import { ASSIGNMENT_KINDS as APP_ASSIGNMENT_KINDS } from '../../../../src/features/assignments/utils/assignmentEstimate';

describe('ASSIGNMENT_KINDS', () => {
  it('matches the kinds the app knows about', () => {
    expect(ASSIGNMENT_KINDS).toEqual(APP_ASSIGNMENT_KINDS);
  });
});

describe('buildEstimatePrompt', () => {
  it('includes the details Claude needs and skips empty ones', () => {
    const prompt = buildEstimatePrompt([
      {
        id: 'a1',
        title: 'Osmosis Lab Report',
        description: 'Write up your results.',
        pointsPossible: 50,
        courseName: 'Cell Biology',
        courseCode: 'BIO 200',
      },
      {
        id: 'a2',
        title: 'Quiz 3',
        description: null,
        pointsPossible: null,
        courseName: null,
        courseCode: null,
      },
    ]);

    expect(prompt).toContain('id: a1\ntitle: Osmosis Lab Report\nclass: BIO 200 - Cell Biology\npoints: 50');
    expect(prompt).toContain('instructions: Write up your results.');
    expect(prompt).toContain('id: a2\ntitle: Quiz 3');
    expect(prompt).not.toContain('points: null');
  });

  it('shortens very long instructions', () => {
    const prompt = buildEstimatePrompt([
      {
        id: 'a1',
        title: 'Essay',
        description: 'x'.repeat(5000),
        pointsPossible: null,
        courseName: null,
        courseCode: null,
      },
    ]);

    expect(prompt.length).toBeLessThan(1700);
  });
});

describe('readEstimates', () => {
  it('rounds times and keeps them within what the database allows', () => {
    expect(
      readEstimates(
        [
          { id: 'a1', minutes: 47, kind: 'homework' },
          { id: 'a2', minutes: 1, kind: 'discussion' },
          { id: 'a3', minutes: 99999, kind: 'project' },
        ],
        ['a1', 'a2', 'a3'],
      ),
    ).toEqual([
      { id: 'a1', minutes: 45, kind: 'homework' },
      { id: 'a2', minutes: 5, kind: 'discussion' },
      { id: 'a3', minutes: 6000, kind: 'project' },
    ]);
  });

  it("drops answers for assignments we didn't ask about, repeats, and bad values", () => {
    expect(
      readEstimates(
        [
          { id: 'a1', minutes: 60, kind: 'quiz' },
          { id: 'a1', minutes: 120, kind: 'quiz' },
          { id: 'other', minutes: 60, kind: 'quiz' },
          { id: 'a2', minutes: Number.NaN, kind: 'quiz' },
          { id: 'a3', minutes: 60, kind: 'party' },
        ],
        ['a1', 'a2', 'a3'],
      ),
    ).toEqual([{ id: 'a1', minutes: 60, kind: 'quiz' }]);
  });
});
