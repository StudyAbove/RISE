// Reads the student's courses and assignments from the Canvas API using the
// Canvas session they're already signed in with. Based on Mo's original
// "Scan this course" code.

/* exported RiseCanvasApi */
const RiseCanvasApi = (() => {
  // Canvas pages results; stop well before anything unreasonable.
  const MAX_PAGES = 50;
  const MAX_DESCRIPTION_LENGTH = 5000;

  async function getPaged(path) {
    const origin = location.origin;
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
        throw new Error('Sign in to Canvas first.');
      }

      if (!response.ok) {
        throw new Error(`Canvas request failed (${response.status}).`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Canvas returned an unexpected response.');
      }

      items.push(...data);

      const next = (response.headers.get('Link') || '').match(/<([^>]+)>;\s*rel="next"/);
      url = next ? new URL(next[1], origin).href : '';
    }

    return items;
  }

  /** Assignment descriptions are HTML; Rise only needs the text. */
  function htmlToText(html) {
    if (!html) {
      return '';
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style').forEach((node) => node.remove());

    return doc.body.textContent.replace(/\s+/g, ' ').trim().slice(0, MAX_DESCRIPTION_LENGTH);
  }

  function isSubmitted(submission) {
    return Boolean(submission && (submission.submitted_at || submission.workflow_state === 'graded'));
  }

  /** Everything Rise syncs, in the shape the canvas-extension function expects. */
  async function collect() {
    const courses = (
      await getPaged('/api/v1/courses?enrollment_state=active&include[]=term&per_page=100')
    ).filter((course) => course.name && !course.access_restricted_by_date);

    const assignmentLists = await Promise.all(
      courses.map((course) =>
        getPaged(`/api/v1/courses/${course.id}/assignments?include[]=submission&per_page=100`)
          // A course can hide its assignments; sync the others anyway.
          .catch(() => [])
          .then((assignments) => assignments.map((assignment) => ({ assignment, course }))),
      ),
    );

    return {
      canvasDomain: location.hostname,
      courses: courses.map((course) => ({
        id: course.id,
        name: course.name,
        code: course.course_code || null,
        term: course.term?.name || null,
      })),
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

  return { collect };
})();
