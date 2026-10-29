import {
  fetchAssignmentById,
  fetchAssignments,
} from '../assignmentsRepository';

const mockRows = jest.fn();
const mockError = jest.fn();
const mockEq = jest.fn();
const mockIs = jest.fn();

// Pretend to be Supabase so these tests don't access real student data.
jest.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: () => {
        let first = 0;
        let last = 499;
        let selectedId: string | undefined;

        const query = {
          select: () => query,
          is: (column: string, value: unknown) => {
            mockIs(column, value);
            return query;
          },
          eq: (column: string, value: string) => {
            mockEq(column, value);

            if (column === 'id') {
              selectedId = value;
            }

            return query;
          },
          order: () => query,
          range: (from: number, to: number) => {
            first = from;
            last = to;
            return query;
          },
          maybeSingle: async () => ({
            data:
              (mockRows() ?? []).find(
                (row: { id: string }) => row.id === selectedId,
              ) ?? null,
            error: mockError(),
          }),
          then: (resolve: (value: unknown) => void) =>
            resolve({
              data: (mockRows() ?? []).slice(first, last + 1),
              error: mockError(),
            }),
        };

        return query;
      },
    },
  };
});

// Sample records are used only by the tests.
function assignmentRow(id = 'a1') {
  return {
    id,
    title: 'Osmosis Lab Report',
    description: 'Write up the experimental results and conclusion.',
    due_at: '2026-11-13T23:59:00Z',
    completed: false,
    source: 'canvas',
    points_possible: 50,
    html_url: 'https://csulb.instructure.com/courses/1/assignments/1',
    estimated_minutes: 150 as number | null,
    kind: 'lab' as string | null,
    courses: {
      name: 'BIOL 201: Cell Biology',
      code: 'BIOL 201',
      color: 'coral',
      sync_enabled: true,
    },
  };
}

beforeEach(() => {
  mockRows.mockReset();
  mockError.mockReset();
  mockEq.mockReset();
  mockIs.mockReset();
  mockRows.mockReturnValue([]);
  mockError.mockReturnValue(null);
});

describe('fetchAssignments', () => {
  it("includes descriptions and class colors, and skips classes that don't sync", async () => {
    const hiddenAssignment = assignmentRow('a2');
    hiddenAssignment.courses.sync_enabled = false;

    mockRows.mockReturnValue([
      assignmentRow(),
      hiddenAssignment,
    ]);

    const assignments = await fetchAssignments();

    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      title: 'Osmosis Lab Report',
      description: 'Write up the experimental results and conclusion.',
      courseCode: 'BIOL 201',
      courseColor: '#F28B82',
      courseTint: '#FDE3E0',
      dueAt: new Date('2026-11-13T23:59:00Z'),
      completed: false,
    });
  });

  it('leaves the section out of class names and codes', async () => {
    const row = assignmentRow();
    row.courses.name = 'BIOL 201 SEC 01: Cell Biology';
    row.courses.code = 'BIOL 201-01';
    mockRows.mockReturnValue([row]);

    const [assignment] = await fetchAssignments();

    expect(assignment).toMatchObject({
      courseName: 'BIOL 201: Cell Biology',
      courseCode: 'BIOL 201',
    });
  });

  it('includes the saved time estimate, or null before one is made', async () => {
    mockRows.mockReturnValue([
      assignmentRow('a1'),
      { ...assignmentRow('a2'), estimated_minutes: null, kind: null },
    ]);

    const assignments = await fetchAssignments();

    expect(assignments[0]).toMatchObject({ estimatedMinutes: 150, kind: 'lab' });
    expect(assignments[1]).toMatchObject({ estimatedMinutes: null, kind: null });
  });

  it('loads assignments beyond the first batch', async () => {
    mockRows.mockReturnValue(
      Array.from({ length: 501 }, (_, index) =>
        assignmentRow(`assignment-${index}`),
      ),
    );

    const assignments = await fetchAssignments();

    expect(assignments).toHaveLength(501);
    expect(assignments[500].id).toBe('assignment-500');
  });

  it('handles missing descriptions, dates, and courses', async () => {
    mockRows.mockReturnValue([
      {
        ...assignmentRow(),
        description: null,
        due_at: null,
        courses: null,
        completed: true,
      },
    ]);

    const assignments = await fetchAssignments();

    expect(assignments[0]).toMatchObject({
      description: null,
      dueAt: null,
      courseName: null,
      courseColor: '#A8BEA3',
      completed: true,
    });
  });

  it('returns an empty list when no assignments exist', async () => {
    await expect(fetchAssignments()).resolves.toEqual([]);
  });

  it('reports database errors instead of returning an empty list', async () => {
    const error = new Error('Could not load assignments');
    mockError.mockReturnValue(error);

    await expect(fetchAssignments()).rejects.toBe(error);
  });
});

describe('fetchAssignmentById', () => {
  it('loads the selected assignment with its own description, course, and date', async () => {
    const selectedAssignment = {
      ...assignmentRow('a2'),
      title: 'History Essay',
      description: 'Compare two historical sources.',
      due_at: '2026-11-20T18:00:00Z',
      courses: {
        name: 'World History',
        code: 'HIST 101',
        color: 'sage',
        sync_enabled: true,
      },
    };

    mockRows.mockReturnValue([
      assignmentRow('a1'),
      selectedAssignment,
    ]);

    const assignment = await fetchAssignmentById('a2');

    expect(mockEq).toHaveBeenCalledWith('id', 'a2');
    expect(mockIs).toHaveBeenCalledWith('removed_at', null);

    expect(assignment).toMatchObject({
      id: 'a2',
      title: 'History Essay',
      description: 'Compare two historical sources.',
      courseName: 'World History',
      courseCode: 'HIST 101',
      courseColor: '#A8BEA3',
      dueAt: new Date('2026-11-20T18:00:00Z'),
    });
  });

  it('returns null when the selected assignment is unavailable', async () => {
    mockRows.mockReturnValue([assignmentRow('a1')]);

    await expect(fetchAssignmentById('missing')).resolves.toBeNull();
  });

  it('does not display assignments from a disabled course', async () => {
    const hiddenAssignment = assignmentRow('a1');
    hiddenAssignment.courses.sync_enabled = false;

    mockRows.mockReturnValue([hiddenAssignment]);

    await expect(fetchAssignmentById('a1')).resolves.toBeNull();
  });

  it('handles missing descriptions, dates, and courses', async () => {
    mockRows.mockReturnValue([
      {
        ...assignmentRow('a1'),
        description: null,
        due_at: null,
        courses: null,
      },
    ]);

    const assignment = await fetchAssignmentById('a1');

    expect(assignment).toMatchObject({
      id: 'a1',
      description: null,
      dueAt: null,
      courseName: null,
      courseCode: null,
      courseColor: '#A8BEA3',
    });
  });

  it('normalizes blank descriptions and invalid dates to null', async () => {
    mockRows.mockReturnValue([
      {
        ...assignmentRow('a1'),
        description: '   ',
        due_at: 'invalid-date',
      },
    ]);

    const assignment = await fetchAssignmentById('a1');

    expect(assignment).toMatchObject({
      description: null,
      dueAt: null,
    });
  });

  it('reports database errors so the screen can offer a retry', async () => {
    const error = new Error('Could not load assignment');
    mockError.mockReturnValue(error);

    await expect(fetchAssignmentById('a1')).rejects.toBe(error);
  });
});