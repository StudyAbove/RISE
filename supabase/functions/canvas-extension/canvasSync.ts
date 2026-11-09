// Checks and shapes the Canvas data the extension sends. Kept free of Deno
// and Supabase imports so Jest can test it.

// Generous limits that a real student's Canvas never reaches, so a bad or
// malicious request can't write unbounded rows.
const MAX_COURSES = 100;
const MAX_ASSIGNMENTS = 5000;
const MAX_TITLE_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_SYLLABUS_LENGTH = 50000;

export type SyncedCourse = {
  canvasCourseId: string;
  name: string;
  code: string | null;
  term: string | null;
  syllabusText: string | null;
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

export type SavedSyllabusReview = {
  courseId: string;
  confirmed: true;
  course_overview: string | null;
  professor_name: string | null;
  professor_email: string | null;
  grading_method: 'points' | 'weighted_categories';
  late_work: string | null;
  office_hours: {
    day_of_week: number;
    start_time: string;
    end_time: string;
    required_booking: boolean;
    booking_link: string | null;
  }[];
  topics: { title: string; percentage: number; total_count: number | null }[];
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

function readUuid(value: unknown, field: string) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new InvalidPayloadError(`${field} must be a course ID.`);
  }

  return value;
}

function readTime(value: unknown, field: string) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) {
    throw new InvalidPayloadError(`${field} must be a valid time.`);
  }

  return value;
}

export function parseSyllabusReview(body: unknown): SavedSyllabusReview {
  if (!isRecord(body) || !isRecord(body.review)) {
    throw new InvalidPayloadError('Expected a confirmed syllabus review.');
  }

  const review = body.review;
  if (review.confirmed !== true) {
    throw new InvalidPayloadError('Confirm the syllabus information before saving it.');
  }

  const gradingMethod = review.grading_method;
  if (gradingMethod !== 'points' && gradingMethod !== 'weighted_categories') {
    throw new InvalidPayloadError('Choose a valid grading method.');
  }

  const officeHoursRaw = review.office_hours ?? [];
  const topicsRaw = review.topics ?? [];
  if (!Array.isArray(officeHoursRaw) || officeHoursRaw.length > 30 || !Array.isArray(topicsRaw) || topicsRaw.length > 50) {
    throw new InvalidPayloadError('The syllabus review has too many entries.');
  }

  const officeHours = officeHoursRaw.map((item, index) => {
    if (!isRecord(item)) {
      throw new InvalidPayloadError('Each office-hours entry must be an object.');
    }

    const day = item.day_of_week;
    if (typeof day !== 'number' || !Number.isInteger(day) || day < 0 || day > 6) {
      throw new InvalidPayloadError(`Office-hours entry ${index + 1} needs a valid day.`);
    }
    if (typeof item.required_booking !== 'boolean') {
      throw new InvalidPayloadError('required_booking must be true or false.');
    }

    const bookingLink = readHttpsUrl(item.booking_link);
    if (item.booking_link != null && item.booking_link !== '' && !bookingLink) {
      throw new InvalidPayloadError('Office-hours booking links must use HTTPS.');
    }

    return {
      day_of_week: day,
      start_time: readTime(item.start_time, 'Office-hours start time'),
      end_time: readTime(item.end_time, 'Office-hours end time'),
      required_booking: item.required_booking,
      booking_link: bookingLink,
    };
  });

  const topics = topicsRaw.map((item, index) => {
    if (!isRecord(item)) {
      throw new InvalidPayloadError('Each grading topic must be an object.');
    }
    const title = readText(item.title, 50);
    const percentage = item.percentage;
    const totalCount = item.total_count;
    if (!title || typeof percentage !== 'number' || !Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw new InvalidPayloadError(`Grading topic ${index + 1} needs a title and percentage from 0 to 100.`);
    }
    if (totalCount != null && (!Number.isInteger(totalCount) || (totalCount as number) < 1)) {
      throw new InvalidPayloadError(`Grading topic ${index + 1} has an invalid total count.`);
    }

    return { title, percentage, total_count: totalCount == null ? null : totalCount as number };
  });

  const professorEmail = readText(review.professor_email, 254);
  if (professorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(professorEmail)) {
    throw new InvalidPayloadError('Enter a valid professor email address.');
  }

  return {
    courseId: readUuid(review.course_id, 'course_id'),
    confirmed: true,
    course_overview: readText(review.course_overview, 5000),
    professor_name: readText(review.professor_name, 100),
    professor_email: professorEmail,
    grading_method: gradingMethod,
    late_work: readText(review.late_work, 200),
    office_hours: officeHours,
    topics,
  };
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
      // Syllabus text is sent to the AI for extraction, but is not persisted.
      syllabusText: readText(course.syllabusText, MAX_SYLLABUS_LENGTH),
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

// Color keys students can pick for a class. Same list as
// src/theme/courseColors.ts and the check on courses.color.
export const COURSE_COLOR_KEYS = [
  'sunbeam',
  'apricot',
  'coral',
  'blush',
  'lilac',
  'periwinkle',
  'sky',
  'aqua',
  'mint',
  'sage',
  'pistachio',
  'sand',
] as const;

export type CourseColorKey = (typeof COURSE_COLOR_KEYS)[number];

export type CourseChoice = {
  canvasCourseId: string;
  color: CourseColorKey;
  syncEnabled: boolean;
};

function isCourseColor(value: unknown): value is CourseColorKey {
  return typeof value === 'string' && (COURSE_COLOR_KEYS as readonly string[]).includes(value);
}

/** The classes the student chose to sync, and their colors. */
export function parseCourseChoices(body: unknown): CourseChoice[] {
  if (!isRecord(body) || !Array.isArray(body.choices) || body.choices.length > MAX_COURSES) {
    throw new InvalidPayloadError('Expected a list of class choices.');
  }

  return body.choices.map((choice): CourseChoice => {
    if (!isRecord(choice) || !isCourseColor(choice.color) || typeof choice.syncEnabled !== 'boolean') {
      throw new InvalidPayloadError('Each class needs a color and whether to sync it.');
    }

    return {
      canvasCourseId: readId(choice.canvasCourseId, 'choice.canvasCourseId'),
      color: choice.color,
      syncEnabled: choice.syncEnabled,
    };
  });
}

/**
 * Colors for classes that don't have one yet: the palette's unused colors in
 * order, then repeating once all twelve are taken.
 */
export function pickColorsForNewCourses(usedColors: (string | null)[], count: number): CourseColorKey[] {
  const unused = COURSE_COLOR_KEYS.filter((key) => !usedColors.includes(key));
  const order = [...unused, ...COURSE_COLOR_KEYS];

  return Array.from({ length: count }, (_, index) => order[index % order.length]);
}
