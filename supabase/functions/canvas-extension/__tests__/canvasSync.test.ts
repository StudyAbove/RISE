import {
  findRemovedAssignmentIds,
  InvalidPayloadError,
  isPairingCode,
  parseSyncPayload,
} from '../canvasSync';

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
      },
    ],
  };
}

describe('parseSyncPayload', () => {
  it('shapes courses and assignments for saving', () => {
    expect(parseSyncPayload(validPayload())).toEqual({
      canvasDomain: 'csulb.instructure.com',
      courses: [
        { canvasCourseId: '101', name: 'BIOL 201: Cell Biology', code: 'BIOL 201', term: 'Fall 2026' },
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
        },
      ],
    });
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
    };

    expect(parseSyncPayload(payload).assignments[0]).toMatchObject({
      title: 'Untitled assignment',
      description: null,
      dueAt: null,
      pointsPossible: null,
      htmlUrl: null,
      submitted: false,
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
