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
  const MAX_SYLLABUS_LENGTH = 50000;
  const MAX_SYLLABUS_FILE_BYTES = 8 * 1024 * 1024;

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
  function htmlToText(html, maxLength = MAX_DESCRIPTION_LENGTH) {
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
      .slice(0, maxLength);
  }

  async function getCanvasObject(origin, path, label) {
    const url = new URL(path, origin);
    if (url.origin !== origin) throw new Error(`Canvas returned a ${label} outside this Canvas site.`);
    const response = await fetch(url.href, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Canvas could not read ${label} (HTTP ${response.status}).`);
    return response.json();
  }

  function syllabusFileName(file) {
    return String(file.display_name || file.filename || file.name || '');
  }

  function supportedSyllabusFile(file, nameHint = '') {
    const name = syllabusFileName(file).toLowerCase();
    const extension = name.split('.').pop();
    return (/syllabus/i.test(name) || /syllabus/i.test(nameHint)) && ['pdf', 'docx', 'txt'].includes(extension);
  }

  async function downloadSyllabusFile(origin, file) {
    const fileName = syllabusFileName(file) || `syllabus-${file.id}`;
    const extension = fileName.toLowerCase().split('.').pop();
    const urlValue = file.url || file.download_url;
    if (!urlValue) throw new Error('Canvas did not provide a syllabus download link.');
    const url = new URL(urlValue, origin);
    if (url.protocol !== 'https:') throw new Error('Canvas returned an insecure syllabus link.');
    const response = await fetch(url.href, {
      credentials: url.origin === origin ? 'include' : 'omit',
    });
    if (!response.ok) throw new Error(`Canvas could not download the syllabus (HTTP ${response.status}).`);
    const blob = await response.blob();
    if (!blob.size) throw new Error('The syllabus document is empty.');
    if (blob.size > MAX_SYLLABUS_FILE_BYTES) throw new Error('Syllabus documents must be 8 MB or smaller.');

    if (extension === 'txt') {
      const text = (await blob.text()).slice(0, MAX_SYLLABUS_LENGTH);
      if (!text.trim()) throw new Error('The syllabus text document is empty.');
      return { kind: 'text', name: fileName, text };
    }

    const type = extension === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return { kind: 'document', name: fileName, type, blob };
  }

  /** Downloads a file linked from the page the student selected as the syllabus. */
  async function downloadSyllabusAttachment(origin, courseId, attachment) {
    const endpoint = attachment?.apiEndpoint;
    const link = new URL(attachment?.url || '', origin);
    if (link.origin !== origin) throw new Error('The linked syllabus file must be hosted on the same Canvas site.');

    const endpointUrl = endpoint ? new URL(endpoint, origin) : null;
    if (endpointUrl && endpointUrl.origin !== origin) throw new Error('Canvas linked a file outside this Canvas site.');
    const match = (endpointUrl?.pathname || link.pathname).match(/\/files\/(\d+)/);
    if (!match) throw new Error('Canvas did not provide a valid file link.');

    const metadataPath = endpointUrl?.pathname || `/api/v1/courses/${encodeURIComponent(courseId)}/files/${encodeURIComponent(match[1])}`;
    const metadata = await getCanvasObject(origin, metadataPath, 'syllabus file');
    return downloadSyllabusFile(origin, {
      ...metadata,
      display_name: metadata.display_name || attachment.title,
      url: metadata.url || metadata.download_url,
    });
  }

  /** Search syllabus files before falling back to Canvas's HTML syllabus/page. */
  async function findSyllabusSource(origin, courseId) {
    const filesPath = `/api/v1/courses/${encodeURIComponent(courseId)}/files?per_page=100`;
    const files = await getPaged(origin, filesPath).catch(() => []);
    const candidates = files.filter(supportedSyllabusFile)
      .sort((a, b) => Number(/syllabus/i.test(syllabusFileName(b))) - Number(/syllabus/i.test(syllabusFileName(a))));
    for (const file of candidates) {
      try {
        const metadata = file.url ? file : await getCanvasObject(
          origin,
          `/api/v1/courses/${encodeURIComponent(courseId)}/files/${encodeURIComponent(file.id)}`,
          'syllabus file',
        );
        return await downloadSyllabusFile(origin, metadata);
      } catch {
        // Try another syllabus document before using the HTML fallback.
      }
    }

    const modulesPath = `/api/v1/courses/${encodeURIComponent(courseId)}/modules?include[]=items&search_term=syllabus&per_page=100`;
    const modules = await getPaged(origin, modulesPath).catch(() => []);
    for (const module of modules) {
      let items = Array.isArray(module.items) ? module.items : [];
      if (!items.length && module.id != null) {
        items = await getPaged(origin, `/api/v1/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(module.id)}/items?per_page=100`).catch(() => []);
      }
      for (const item of items) {
        if (!/syllabus/i.test(item?.title || '') || item.type !== 'File' || item.content_id == null) continue;
        try {
          const metadata = await getCanvasObject(
            origin,
            `/api/v1/courses/${encodeURIComponent(courseId)}/files/${encodeURIComponent(item.content_id)}`,
            'syllabus file',
          );
          if (supportedSyllabusFile(metadata, item.title)) return await downloadSyllabusFile(origin, metadata);
        } catch {
          // Continue through module files in case another syllabus copy is available.
        }
      }
    }

    return null;
  }

  /** HTML syllabus body and module pages are the fallback after files. */
  async function findHtmlSyllabus(origin, courseId) {
    try {
      const course = await getCanvasObject(
        origin,
        `/api/v1/courses/${encodeURIComponent(courseId)}?include[]=syllabus_body`,
        'course syllabus',
      );
      const text = htmlToText(course.syllabus_body || '', MAX_SYLLABUS_LENGTH);
      if (text) return { name: 'Canvas course syllabus (HTML)', text };
    } catch {
      // Try an HTML page titled Syllabus below.
    }

    const modulesPath = `/api/v1/courses/${encodeURIComponent(courseId)}/modules?include[]=items&search_term=syllabus&per_page=100`;
    const modules = await getPaged(origin, modulesPath).catch(() => []);
    for (const module of modules) {
      let items = Array.isArray(module.items) ? module.items : [];
      if (!items.length && module.id != null) {
        items = await getPaged(origin, `/api/v1/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(module.id)}/items?per_page=100`).catch(() => []);
      }
      for (const item of items) {
        if (!/syllabus/i.test(item?.title || '') || item.type !== 'Page' || !item.page_url) continue;
        try {
          const page = await getCanvasObject(
            origin,
            `/api/v1/courses/${encodeURIComponent(courseId)}/pages/${encodeURIComponent(item.page_url)}`,
            'syllabus page',
          );
          const text = htmlToText(page.body || '', MAX_SYLLABUS_LENGTH);
          if (text) return { name: page.title || item.title || 'Canvas syllabus page (HTML)', text };
        } catch {
          // Continue in case another syllabus page is available.
        }
      }
    }

    return null;
  }

  /** Finds the strongest Canvas route to a syllabus without reading it yet. */
  async function findLikelySyllabusPath(origin, courseId) {
    const candidates = [];
    const add = (url, title, kind, score) => {
      if (!url) return;
      const target = new URL(url, origin);
      if (target.protocol !== 'https:') return;
      candidates.push({ url: target.href, title: title || 'Syllabus', kind, score });
    };

    try {
      const course = await getCanvasObject(
        origin,
        `/api/v1/courses/${encodeURIComponent(courseId)}?include[]=syllabus_body`,
        'course syllabus',
      );
      if (htmlToText(course.syllabus_body || '', MAX_SYLLABUS_LENGTH)) {
        add(`/courses/${encodeURIComponent(courseId)}/assignments/syllabus`, 'Course syllabus', 'Canvas syllabus page', 90);
      }
    } catch {
      // A syllabus may still be available as a file or module item.
    }

    const files = await getPaged(origin, `/api/v1/courses/${encodeURIComponent(courseId)}/files?per_page=100`).catch(() => []);
    for (const file of files) {
      if (!supportedSyllabusFile(file)) continue;
      const fileId = file.id;
      if (fileId == null) continue;
      add(`/courses/${encodeURIComponent(courseId)}/files/${encodeURIComponent(fileId)}?wrap=1`, syllabusFileName(file), 'Canvas document', 100);
    }

    const pages = await getPaged(origin, `/api/v1/courses/${encodeURIComponent(courseId)}/pages?per_page=100`).catch(() => []);
    for (const pageSummary of pages.filter((page) => /syllabus/i.test(page.title || ''))) {
      add(`/courses/${encodeURIComponent(courseId)}/pages/${encodeURIComponent(pageSummary.url)}`, pageSummary.title, 'Canvas page', 105);
      try {
        const page = await getCanvasObject(
          origin,
          `/api/v1/courses/${encodeURIComponent(courseId)}/pages/${encodeURIComponent(pageSummary.url)}`,
          'syllabus page',
        );
        const anchors = [...String(page.body || '').matchAll(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)];
        for (const anchor of anchors) {
          const href = anchor[2].replace(/&amp;/g, '&');
          const linkText = htmlToText(anchor[3], 240);
          try {
            const target = new URL(href, origin);
            if (target.hostname === 'docs.google.com' && (/syllabus/i.test(linkText) || /syllabus/i.test(page.title || ''))) {
              add(target.href, linkText || page.title, 'Google Docs', 115);
            }
          } catch {
            // Ignore malformed links in a page body.
          }
        }
      } catch {
        // The Canvas page itself remains a useful candidate if its body is unavailable.
      }
    }

    const modules = await getPaged(
      origin,
      `/api/v1/courses/${encodeURIComponent(courseId)}/modules?include[]=items&search_term=syllabus&per_page=100`,
    ).catch(() => []);
    for (const module of modules) {
      let items = Array.isArray(module.items) ? module.items : [];
      if (!items.length && module.id != null) {
        items = await getPaged(origin, `/api/v1/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(module.id)}/items?per_page=100`).catch(() => []);
      }
      for (const item of items) {
        const title = String(item?.title || module.name || 'Syllabus');
        const hasSyllabusContext = /syllabus/i.test(title) || /syllabus/i.test(module.name || '');
        if (!hasSyllabusContext) continue;
        const score = /syllabus/i.test(item?.title || '') ? 110 : 75;
        if (item.type === 'Page' && item.page_url) {
          add(`/courses/${encodeURIComponent(courseId)}/pages/${encodeURIComponent(item.page_url)}`, title, 'Canvas page', score);
        } else if (item.type === 'File' && item.content_id != null) {
          try {
            const file = await getCanvasObject(
              origin,
              `/api/v1/courses/${encodeURIComponent(courseId)}/files/${encodeURIComponent(item.content_id)}`,
              'syllabus file',
            );
            const name = syllabusFileName(file) || title;
            if (supportedSyllabusFile(file, title)) {
              add(`/courses/${encodeURIComponent(courseId)}/files/${encodeURIComponent(item.content_id)}?wrap=1`, name, 'Canvas document', score + 5);
            }
          } catch {
            // Ignore inaccessible module files and consider the other candidates.
          }
        } else if (item.type === 'ExternalUrl' && item.external_url) {
          const url = new URL(item.external_url, origin);
          if (url.hostname === 'docs.google.com') add(url.href, title, 'Google Docs', score + 5);
        }
      }
    }

    const unique = [...new Map(candidates.map((candidate) => [candidate.url, candidate])).values()];
    unique.sort((a, b) => b.score - a.score);
    if (!unique.length) return null;
    const { score, ...best } = unique[0];
    return { ...best, confidence: score >= 100 ? 'high' : score >= 90 ? 'medium' : 'low' };
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

  /**
   * The student's name for Rise's greeting: the name they go by in Canvas
   * ("short name"), or their full name. Null if Canvas doesn't say; the sync
   * works without it.
   */
  async function getStudentName(origin) {
    try {
      const response = await fetch(new URL('/api/v1/users/self', origin).href, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return null;
      }

      const user = await response.json().catch(() => null);
      const name = user?.short_name || user?.name;

      return typeof name === 'string' && name.trim() ? name.trim() : null;
    } catch {
      return null;
    }
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
    const [courses, studentName] = await Promise.all([collectCourses(origin), getStudentName(origin)]);

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
      studentName,
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

  return { collect, collectCourses, findSyllabusSource, findHtmlSyllabus, findLikelySyllabusPath, downloadSyllabusAttachment };
})();
