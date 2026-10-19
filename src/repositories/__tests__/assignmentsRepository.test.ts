import { fetchAssignments } from '../assignmentsRepository';

const mockRows = jest.fn();
const mockError = jest.fn();

// Pretend to be Supabase so these tests don't access real student data.
jest.mock('../../lib/supabase', () => {
  let first = 0;
  let last = 499;

  const query = {
    select: () => query,
    is: () => query,
    order: () => query,
    range: (from: number, to: number) => {
      first = from;
      last = to;
      return query;
    },
    then: (resolve: (value: unknown) => void) =>
      resolve({
        data: (mockRows() ?? []).slice(first, last + 1),
        error: mockError(),
      }),
  };

  return { supabase: { from: () => query } };
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
    courses: {
      name: 'BIOL 201: Cell Biology',
      code: 'BIOL 201',
      color: 'coral',
      sync_enabled: true,
    },
  };
}

describe('fetchAssignments', () => {
  beforeEach(() => {
    mockRows.mockReset();
    mockError.mockReset();
    mockRows.mockReturnValue([]);
    mockError.mockReturnValue(null);
  });

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