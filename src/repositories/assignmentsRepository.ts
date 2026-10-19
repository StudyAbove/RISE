import { supabase } from '../lib/supabase';
import { getCourseColor } from '../theme/courseColors';

export type Assignment = {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  completed: boolean;
  source: 'rise' | 'canvas';
  courseName: string | null;
  courseCode: string | null;
  /** The class's color (from courseColors) for dots, bars and chips. */
  courseColor: string;
  /** A pale version of the class's color for backgrounds. */
  courseTint: string;
  pointsPossible: number | null;
  /** Opens the assignment in Canvas, for synced assignments. */
  htmlUrl: string | null;
};

type AssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  completed: boolean;
  source: 'rise' | 'canvas';
  points_possible: number | null;
  html_url: string | null;
  courses: {
    name: string;
    code: string | null;
    color: string | null;
    sync_enabled: boolean;
  } | null;
};

// Read up to 500 assignments in each request.
const PAGE_SIZE = 500;

/**
 * The student's assignments, soonest due first, each with its class's color.
 * Leaves out ones removed from Canvas and ones from classes the student
 * stopped syncing.
 *
 * Supabase's row-level security controls which records can be read.
 */
export async function fetchAssignments(): Promise<Assignment[]> {
  const rows: AssignmentRow[] = [];
  let offset = 0;

  // Keep requesting batches until there are no more assignments.
  while (true) {
    const { data, error } = await supabase
      .from('assignments')
      .select(
        'id, title, description, due_at, completed, source, points_possible, html_url, courses(name, code, color, sync_enabled)',
      )
      .is('removed_at', null)
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const batch = (data ?? []) as unknown as AssignmentRow[];

    if (batch.length === 0) break;

    rows.push(...batch);
    offset += batch.length;
  }

  return rows
    .filter((row) => row.courses?.sync_enabled !== false)
    .map((row) => {
      const { color, tint } = getCourseColor(row.courses?.color);
      const parsedDate = row.due_at ? new Date(row.due_at) : null;

      return {
        id: row.id,
        title: row.title,
        description: row.description?.trim() || null,
        // Keep missing or invalid dates as null.
        dueAt:
          parsedDate && Number.isFinite(parsedDate.getTime())
            ? parsedDate
            : null,
        completed: row.completed,
        source: row.source,
        courseName: row.courses?.name ?? null,
        courseCode: row.courses?.code ?? null,
        courseColor: color,
        courseTint: tint,
        pointsPossible: row.points_possible,
        htmlUrl: row.html_url,
      };
    });
}