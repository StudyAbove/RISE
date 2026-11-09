// Reads the student's courses and assignments from the Canvas API using the
// Canvas session they're already signed in with. Based on Mo's original
// "Scan this course" code.
//
// Runs on Canvas pages and in the background service worker, so it avoids
// page-only APIs like DOMParser and location.

/* exported RiseCanvasApi */
const RiseCanvasApi = (() => {
  // Canvas pages results; stop well before anything unreasonable.
  const MAX_PAGES = 50;
  const MAX_DESCRIPTION_LENGTH = 5000;

  /** Thrown when Canvas has no signed-in session to read with. */
  class CanvasSignedOutError extends Error {
    constructor() {
      super('Sign in to Canvas, then try again.');
      this.code = 'canvas_signed_out';
    }
  }

  async function getPaged(origin, path) {
    const items = [];
    let url = new URL(path, origin).href;

    for (let page = 0; url && page < MAX_PAGES; page++) {
      if (new URL(url).origin !== origin) {
        throw new Error('Canvas returned a link outside this Canvas site.');
      }

      const response = await fetch(url, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (response.status === 401) {
        throw new CanvasSignedOutError();
      }

      if (!response.ok) {
        throw new Error(`Canvas request failed (${response.status}).`);
      }

      const data = await response.json().catch(() => null);

      // A signed-out session can get the HTML login page instead of JSON.
      if (!Array.isArray(data)) {
        throw new CanvasSignedOutError();
      }

      items.push(...data);

      const next = (response.headers.get('Link') || '').match(/<([^>]+)>;\s*rel="next"/);
      url = next ? new URL(next[1], origin).href : '';
    }

    return items;
  }

  const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

  /** Assignment descriptions are HTML; Rise only needs the text. */
  function htmlToText(html) {
    if (!html) {
      return '';
    }

    return html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&(#\d+|[a-z]+);/gi, (entity, name) =>
        name.startsWith('#') ? String.fromCharCode(Number(name.slice(1))) : (ENTITIES[name.toLowerCase()] ?? entity),
      )
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_DESCRIPTION_LENGTH);
  }

  function isSubmitted(submission) {
    return Boolean(submission && (submission.submitted_at || submission.workflow_state === 'graded'));
  }

  function courseRole(course) {
    const enrollments = course.enrollments ?? [];
    const roles = enrollments.flatMap((enrollment) => [
      enrollment.type,
      enrollment.role,
      enrollment.role_name,
      enrollment.enrollment_type,
    ]).filter((role) => typeof role === 'string').map((role) => role.toLowerCase().replace(/[^a-z]/g, ''));
    const hasStudentEnrollment = roles.some((role) => role === 'student' || role === 'studentenrollment');
    const hasTaEnrollment = roles.some((role) =>
      role === 'ta' || role === 'taenrollment' || role.includes('teachingassistant'),
    );

    if (hasStudentEnrollment) return 'student';
    if (hasTaEnrollment) return 'ta';
    return 'other';
  }

  function isCurrentTerm(term) {
    if (!term?.start_at && !term?.end_at) return false;
    const start = term.start_at ? Date.parse(term.start_at) : -Infinity;
    const endValue = term.end_at;
    const end = endValue
      ? Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(endValue) ? `${endValue}T23:59:59.999Z` : endValue)
      : Infinity;
    const now = Date.now();
    return (!Number.isNaN(start) && now >= start) && (!Number.isNaN(end) && now <= end);
  }

  /** The student's current classes. */
  async function collectCourses(origin) {
    const courses = await getPaged(origin, '/api/v1/courses?enrollment_state=active&include[]=term&include[]=enrollments&per_page=100');

    return courses
      .filter((course) => course.name && !course.access_restricted_by_date)
      .map((course) => ({
        id: course.id,
        name: course.name,
        code: course.course_code || null,
        term: course.term?.name || null,
        courseRole: courseRole(course),
        isCurrentTerm: isCurrentTerm(course.term),
      }));
  }

  /** Everything Rise syncs, in the shape the canvas-extension function expects. */
  async function collect(origin) {
    const courses = await collectCourses(origin);

    const assignmentLists = await Promise.all(
      courses.map((course) =>
        getPaged(origin, `/api/v1/courses/${course.id}/assignments?include[]=submission&per_page=100`)
          // A course can hide its assignments; sync the others anyway.
          .catch(() => [])
          .then((assignments) => assignments.map((assignment) => ({ assignment, course }))),
      ),
    );

    return {
      canvasDomain: new URL(origin).hostname,
      courses,
      assignments: assignmentLists.flat().map(({ assignment, course }) => ({
        id: assignment.id,
        courseId: course.id,
        title: assignment.name,
        description: htmlToText(assignment.description),
        dueAt: assignment.due_at,
        pointsPossible: assignment.points_possible,
        htmlUrl: assignment.html_url,
        submitted: isSubmitted(assignment.submission),
      })),
    };
  }

  return { collect, collectCourses };
})();
