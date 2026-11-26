import {
  COURSE_COLOR_KEYS,
  findRemovedAssignmentIds,
  InvalidPayloadError,
  isPairingCode,
  parseCourseChoices,
  parseSyncPayload,
  pickColorsForNewCourses,
} from '../canvasSync';
import { COURSE_COLOR_KEYS as APP_COURSE_COLOR_KEYS } from '../../../../src/theme/courseColors';

function validPayload() {
  return {
    canvasDomain: 'csulb.instructure.com',
    courses: [{ id: 101, name: 'BIOL 201: Cell Biology', code: 'BIOL 201', term: 'Fall 2026' }],
    assignments: [
      {
        id: 9001,
        courseId: 101,
        title: '  Osmosis Lab Report  ',
        description: 'Write up the lab.',
        dueAt: '2026-11-13T23:59:00Z',
        pointsPossible: 50,
        htmlUrl: 'https://csulb.instructure.com/courses/101/assignments/9001',
        submitted: true,
        submittedAt: '2026-11-13T22:15:00Z',
        submissionTypes: ['online_upload'],
      },
    ],
  };
}

describe('parseSyncPayload', () => {
  it('shapes courses and assignments for saving', () => {
    expect(parseSyncPayload(validPayload())).toEqual({
      canvasDomain: 'csulb.instructure.com',
      studentName: null,
      courses: [
        {
          canvasCourseId: '101',
          name: 'BIOL 201: Cell Biology',
          code: 'BIOL 201',
          term: 'Fall 2026',
          syllabusText: null,
        },
      ],
      assignments: [
        {
          canvasAssignmentId: '9001',
          canvasCourseId: '101',
          title: 'Osmosis Lab Report',
          description: 'Write up the lab.',
          dueAt: '2026-11-13T23:59:00.000Z',
          pointsPossible: 50,
          htmlUrl: 'https://csulb.instructure.com/courses/101/assignments/9001',
          submitted: true,
          submittedAt: '2026-11-13T22:15:00.000Z',
          submissionTypes: ['online_upload'],
        },
      ],
    });
  });

  it('reads when and how each assignment is turned in (#175)', () => {
    const read = (details: object) =>
      parseSyncPayload({
        ...validPayload(),
        assignments: [{ ...validPayload().assignments[0], ...details }],
      }).assignments[0];

    expect(read({ submittedAt: 'not a date' }).submittedAt).toBeNull();
    expect(read({ submittedAt: null }).submittedAt).toBeNull();
    expect(read({ submissionTypes: ['on_paper'] }).submissionTypes).toEqual(['on_paper']);
    // Older extensions don't send the types.
    expect(read({ submissionTypes: undefined }).submissionTypes).toBeNull();
    // Only Canvas-style names are kept.
    expect(
      read({ submissionTypes: ['online_url', 42, 'DROP TABLE', 'x'.repeat(41)] }).submissionTypes,
    ).toEqual(['online_url']);
    expect(
      read({ submissionTypes: Array.from({ length: 30 }, () => 'online_upload') }).submissionTypes,
    ).toHaveLength(20);
  });

  it("reads the student's Canvas name for the greeting", () => {
    expect(parseSyncPayload({ ...validPayload(), studentName: '  Julia Matinyan  ' }).studentName).toBe(
      'Julia Matinyan',
    );
    expect(parseSyncPayload({ ...validPayload(), studentName: 'x'.repeat(500) }).studentName).toHaveLength(100);
    expect(parseSyncPayload({ ...validPayload(), studentName: 42 }).studentName).toBeNull();
    expect(parseSyncPayload({ ...validPayload(), studentName: '   ' }).studentName).toBeNull();
  });

  it('fills in safe defaults for missing details', () => {
    const payload = validPayload();
    payload.assignments[0] = {
      id: 9001,
      courseId: 101,
      title: '',
      description: '',
      dueAt: 'not a date',
      pointsPossible: Number.NaN,
      htmlUrl: 'javascript:alert(1)',
      submitted: false,
      submittedAt: '',
      submissionTypes: [],
    };

    expect(parseSyncPayload(payload).assignments[0]).toMatchObject({
      title: 'Untitled assignment',
      description: null,
      dueAt: null,
      pointsPossible: null,
      htmlUrl: null,
      submitted: false,
      submittedAt: null,
      submissionTypes: [],
    });
  });

  it.each([
    ['no assignments list', { canvasDomain: 'csulb.instructure.com', courses: [] }],
    ['a bad Canvas ID', { ...validPayload(), courses: [{ id: 'abc', name: 'X' }] }],
    ['a bad domain', { ...validPayload(), canvasDomain: 'not a domain' }],
    [
      'an assignment for a course that was not synced',
      { ...validPayload(), assignments: [{ ...validPayload().assignments[0], courseId: 999 }] },
    ],
  ])('rejects %s', (_, body) => {
    expect(() => parseSyncPayload(body)).toThrow(InvalidPayloadError);
  });
});

describe('findRemovedAssignmentIds', () => {
  it('returns saved assignments that Canvas no longer lists', () => {
    const saved = [
      { id: 'kept', canvas_assignment_id: '1' },
      { id: 'removed', canvas_assignment_id: '2' },
    ];

    expect(findRemovedAssignmentIds(saved, new Set(['1']))).toEqual(['removed']);
  });
});

describe('isPairingCode', () => {
  it.each([
    ['123456', true],
    ['012345', true],
    ['12345', false],
    ['12a456', false],
    [123456, false],
  ])('%p → %p', (value, expected) => {
    expect(isPairingCode(value)).toBe(expected);
  });
});

describe('parseCourseChoices', () => {
  it('reads which classes to sync and their colors', () => {
    expect(
      parseCourseChoices({ choices: [{ canvasCourseId: 101, color: 'coral', syncEnabled: false }] }),
    ).toEqual([{ canvasCourseId: '101', color: 'coral', syncEnabled: false }]);
  });

  it('rejects colors that are not in the palette', () => {
    expect(() =>
      parseCourseChoices({ choices: [{ canvasCourseId: 101, color: 'red', syncEnabled: true }] }),
    ).toThrow(InvalidPayloadError);
  });
});

describe('pickColorsForNewCourses', () => {
  it('uses colors the student has not used yet, in palette order', () => {
    expect(pickColorsForNewCourses(['sunbeam', 'coral'], 3)).toEqual(['apricot', 'blush', 'lilac']);
  });

  it('starts repeating once every color is taken', () => {
    expect(pickColorsForNewCourses([...COURSE_COLOR_KEYS], 2)).toEqual(['sunbeam', 'apricot']);
  });

  it('offers the same colors as the app', () => {
    expect([...COURSE_COLOR_KEYS]).toEqual(APP_COURSE_COLOR_KEYS);
  });
});
