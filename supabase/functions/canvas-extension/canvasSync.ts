// Checks and shapes the Canvas data the extension sends. Kept free of Deno
// and Supabase imports so Jest can test it.

// Generous limits that a real student's Canvas never reaches, so a bad or
// malicious request can't write unbounded rows.
const MAX_COURSES = 100;
const MAX_ASSIGNMENTS = 5000;
const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 5000;

export type SyncedCourse = {
  canvasCourseId: string;
  name: string;
  code: string | null;
  term: string | null;
};

export type SyncedAssignment = {
  canvasAssignmentId: string;
  canvasCourseId: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  pointsPossible: number | null;
  htmlUrl: string | null;
  submitted: boolean;
};

export type SyncPayload = {
  canvasDomain: string;
  courses: SyncedCourse[];
  assignments: SyncedAssignment[];
};

/** Thrown when the extension sends something RISE can't save. */
export class InvalidPayloadError extends Error {}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Canvas IDs arrive as numbers; RISE stores them as text. */
function readId(value: unknown, field: string): string {
  if (
    (typeof value === 'number' && Number.isInteger(value)) ||
    (typeof value === 'string' && /^\d+$/.test(value))
  ) {
    return String(value);
  }

  throw new InvalidPayloadError(`${field} must be a Canvas ID.`);
}

function readText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function readDate(value: unknown): string | null {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    return null;
  }

  return new Date(value).toISOString();
}

function readHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

/** The Canvas site the data came from, e.g. "csulb.instructure.com". */
function readCanvasDomain(value: unknown): string {
  if (
    typeof value === 'string' &&
    /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value) &&
    value.length <= 253
  ) {
    return value.toLowerCase();
  }

  throw new InvalidPayloadError('canvasDomain must be a host name.');
}

export function parseSyncPayload(body: unknown): SyncPayload {
  if (!isRecord(body) || !Array.isArray(body.courses) || !Array.isArray(body.assignments)) {
    throw new InvalidPayloadError('Expected courses and assignments.');
  }

  if (body.courses.length > MAX_COURSES || body.assignments.length > MAX_ASSIGNMENTS) {
    throw new InvalidPayloadError('Too many courses or assignments in one sync.');
  }

  const courses = body.courses.map((course): SyncedCourse => {
    if (!isRecord(course)) {
      throw new InvalidPayloadError('Each course must be an object.');
    }

    return {
      canvasCourseId: readId(course.id, 'course.id'),
      name: readText(course.name, MAX_TITLE_LENGTH) ?? 'Untitled course',
      code: readText(course.code, MAX_TITLE_LENGTH),
      term: readText(course.term, MAX_TITLE_LENGTH),
    };
  });

  const courseIds = new Set(courses.map((course) => course.canvasCourseId));

  const assignments = body.assignments.map((assignment): SyncedAssignment => {
    if (!isRecord(assignment)) {
      throw new InvalidPayloadError('Each assignment must be an object.');
    }

    const canvasCourseId = readId(assignment.courseId, 'assignment.courseId');

    if (!courseIds.has(canvasCourseId)) {
      throw new InvalidPayloadError('Each assignment must belong to a synced course.');
    }

    return {
      canvasAssignmentId: readId(assignment.id, 'assignment.id'),
      canvasCourseId,
      title: readText(assignment.title, MAX_TITLE_LENGTH) ?? 'Untitled assignment',
      description: readText(assignment.description, MAX_DESCRIPTION_LENGTH),
      dueAt: readDate(assignment.dueAt),
      pointsPossible:
        typeof assignment.pointsPossible === 'number' && Number.isFinite(assignment.pointsPossible)
          ? assignment.pointsPossible
          : null,
      htmlUrl: readHttpsUrl(assignment.htmlUrl),
      submitted: assignment.submitted === true,
    };
  });

  return {
    canvasDomain: readCanvasDomain(body.canvasDomain),
    courses,
    assignments,
  };
}

/**
 * Canvas assignments RISE has saved for the synced courses that the latest
 * sync no longer includes, i.e. ones removed from Canvas.
 */
export function findRemovedAssignmentIds(
  saved: { id: string; canvas_assignment_id: string | null }[],
  syncedCanvasIds: Set<string>,
): string[] {
  return saved
    .filter(
      (assignment) =>
        assignment.canvas_assignment_id !== null &&
        !syncedCanvasIds.has(assignment.canvas_assignment_id),
    )
    .map((assignment) => assignment.id);
}

/** Pairing codes are always six digits. */
export function isPairingCode(value: unknown): value is string {
  return typeof value === 'string' && /^\d{6}$/.test(value);
}
