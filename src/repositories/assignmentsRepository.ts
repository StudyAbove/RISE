import type { AssignmentKind } from '../features/assignments/utils/assignmentEstimate';
import {
  removeCourseCodeSection,
  removeCourseSection,
} from '../features/canvas/utils/courseNames';
import { supabase } from '../lib/supabase';
import { getCourseColor } from '../theme/courseColors';

export type Assignment = {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  completed: boolean;
  /** When RISE first recorded completion; used for List retention. */
  completedAt?: Date | null;
  source: 'rise' | 'canvas';
  /** The class's ID in RISE, for showing one class's work (#61). */
  courseId?: string | null;
  courseName: string | null;
  courseCode: string | null;
  /** The class's color (from courseColors) for dots, bars and chips. */
  courseColor: string;
  /** A pale version of the class's color for backgrounds. */
  courseTint: string;
  pointsPossible: number | null;
  /** Opens the assignment in Canvas, for synced assignments. */
  htmlUrl: string | null;
  /**
   * Saved by the estimate-assignments function. Null until it runs; use
   * getAssignmentEstimate() to always get a time.
   */
  estimatedMinutes: number | null;
  kind: AssignmentKind | null;
  /**
   * The assignment's saved microtasks in order, for its progress bar (#46)
   * and the Weekly Forecast (#61). Empty until microtasks are created.
   */
  microtasks?: MicrotaskSummary[];
};

/** What List, Study and Home need from each of an assignment's microtasks. */
export type MicrotaskSummary = {
  id: string;
  title: string;
  position: number;
  estimatedMinutes: number;
  completed: boolean;
};

type AssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  completed: boolean;
  completed_at: string | null;
  source: 'rise' | 'canvas';
  course_id: string | null;
  points_possible: number | null;
  html_url: string | null;
  estimated_minutes: number | null;
  kind: AssignmentKind | null;
  courses: {
    name: string;
    code: string | null;
    color: string | null;
    sync_enabled: boolean;
  } | null;
  assignment_microtasks: {
    id: string;
    title: string;
    position: number;
    estimated_minutes: number;
    completed: boolean;
  }[] | null;
};

const ASSIGNMENT_COLUMNS =
  'id, title, description, due_at, completed, completed_at, source, course_id, points_possible, html_url, estimated_minutes, kind, courses(name, code, color, sync_enabled), assignment_microtasks(id, title, position, estimated_minutes, completed)';

function toMicrotaskSummaries(row: AssignmentRow): MicrotaskSummary[] {
  return (row.assignment_microtasks ?? [])
    .map((task) => ({
      id: task.id,
      title: task.title,
      position: task.position,
      estimatedMinutes: task.estimated_minutes,
      completed: task.completed,
    }))
    .sort((a, b) => a.position - b.position);
}

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
        ASSIGNMENT_COLUMNS,
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
        completedAt:
          row.completed_at &&
          Number.isFinite(Date.parse(row.completed_at))
            ? new Date(row.completed_at)
            : null,
        source: row.source,
        courseId: row.course_id,
        // Without the section, e.g. "SEC 01".
        courseName: row.courses?.name ? removeCourseSection(row.courses.name) : null,
        courseCode: row.courses?.code ? removeCourseCodeSection(row.courses.code) : null,
        courseColor: color,
        courseTint: tint,
        pointsPossible: row.points_possible,
        htmlUrl: row.html_url,
        estimatedMinutes: row.estimated_minutes,
        kind: row.kind,
        microtasks: toMicrotaskSummaries(row),
      };
    });
}

/**
 * Load one assignment for the shared assignment-details screen.
 * Supabase's row-level security limits access to the student's own records.
 */
export async function fetchAssignmentById(
  assignmentId: string,
): Promise<Assignment | null> {
  const { data, error } = await supabase
    .from('assignments')
    .select(
      ASSIGNMENT_COLUMNS,
    )
    .eq('id', assignmentId)
    .is('removed_at', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data as unknown as AssignmentRow | null;

  // Removed, unavailable, or disabled-course assignments are not displayed.
  if (!row || row.courses?.sync_enabled === false) {
    return null;
  }

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
    completedAt:
      row.completed_at &&
      Number.isFinite(Date.parse(row.completed_at))
        ? new Date(row.completed_at)
        : null,
    source: row.source,
    courseId: row.course_id,
    // Without the section, e.g. "SEC 01".
    courseName: row.courses?.name ? removeCourseSection(row.courses.name) : null,
    courseCode: row.courses?.code ? removeCourseCodeSection(row.courses.code) : null,
    courseColor: color,
    courseTint: tint,
    pointsPossible: row.points_possible,
    htmlUrl: row.html_url,
    estimatedMinutes: row.estimated_minutes,
    kind: row.kind,
    microtasks: toMicrotaskSummaries(row),
  };
}
// Each call estimates up to 25 assignments; stop after this many calls.
const MAX_ESTIMATE_ROUNDS = 4;

/**
 * Ask the estimate-assignments Edge Function to estimate how long the
 * student's unfinished assignments will take. Returns how many it saved.
 * Reload assignments afterward to see the new times.
 */
export async function requestAssignmentEstimates(): Promise<number> {
  let estimated = 0;

  for (let round = 0; round < MAX_ESTIMATE_ROUNDS; round++) {
    const { data, error } = await supabase.functions.invoke('estimate-assignments', {
      method: 'POST',
    });

    if (error) {
      throw error;
    }

    estimated += Number(data?.estimated ?? 0);

    if (!data?.remaining) break;
  }

  return estimated;
}
