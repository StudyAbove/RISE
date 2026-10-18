import { fetchAssignments } from '../assignmentsRepository';

const mockRows = jest.fn();

// Each query method returns the same chain; awaiting it gives the rows.
jest.mock('../../lib/supabase', () => {
  const query = {
    select: () => query,
    is: () => query,
    order: () => query,
    then: (resolve: (value: unknown) => void) => resolve({ data: mockRows(), error: null }),
  };

  return { supabase: { from: () => query } };
});

describe('fetchAssignments', () => {
  it("gives each assignment its class's color and skips classes that don't sync", async () => {
    mockRows.mockReturnValue([
      {
        id: 'a1',
        title: 'Osmosis Lab Report',
        due_at: '2026-11-13T23:59:00Z',
        completed: false,
        source: 'canvas',
        points_possible: 50,
        html_url: 'https://csulb.instructure.com/courses/1/assignments/1',
        courses: { name: 'BIOL 201: Cell Biology', code: 'BIOL 201', color: 'coral', sync_enabled: true },
      },
      {
        id: 'a2',
        title: 'Essay draft',
        due_at: null,
        completed: false,
        source: 'canvas',
        points_possible: null,
        html_url: null,
        courses: { name: 'ENGL 220', code: 'ENGL 220', color: 'apricot', sync_enabled: false },
      },
    ]);

    const assignments = await fetchAssignments();

    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      title: 'Osmosis Lab Report',
      courseCode: 'BIOL 201',
      courseColor: '#F28B82',
      courseTint: '#FDE3E0',
      dueAt: new Date('2026-11-13T23:59:00Z'),
    });
  });
});
