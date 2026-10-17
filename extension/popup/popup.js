const scanButton = document.querySelector('#scan');
const exportButton = document.querySelector('#export');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
let latestData = null;

scanButton.addEventListener('click', scanCurrentCourse);
exportButton.addEventListener('click', exportJson);

async function scanCurrentCourse() {
  scanButton.disabled = true;
  results.hidden = true;
  status.classList.remove('error');
  status.textContent = 'Checking the current tab…';

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab?.id || !/^https?:/.test(tab.url || '')) {
      throw new Error('Open a Canvas course page in this tab first.');
    }

    const match = new URL(tab.url).pathname.match(/\/courses\/(\d+)(?:\/|$)/);

    if (!match) {
      throw new Error(
        'This page does not look like a Canvas course. Open a page under /courses/{course id}.'
      );
    }

    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [match[1]],
      func: collectCourseData
    });

    if (!injection?.result) {
      throw new Error(
        'Canvas did not return course data. Try opening the course again and scanning.'
      );
    }

    latestData = injection.result;
    render(latestData);
    status.textContent = 'Scan complete. Review the results before exporting.';
  } catch (error) {
    status.classList.add('error');
    status.textContent = error.message || 'Could not scan this page.';
  } finally {
    scanButton.disabled = false;
  }
}

async function collectCourseData(courseId) {
  const origin = location.origin;
  const base = `${origin}/api/v1/courses/${encodeURIComponent(courseId)}`;

  async function getJson(path) {
    const response = await fetch(path, {
      credentials: 'include',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Canvas request failed (${response.status}).`);
    }

    return response.json();
  }

  async function getPaged(path) {
    const all = [];
    let url = new URL(path, origin).href;

    for (let page = 0; url && page < 50; page++) {
      if (new URL(url).origin !== origin) {
        throw new Error('Canvas returned a link outside the current site.');
      }

      const response = await fetch(url, {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Canvas request failed (${response.status}).`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Canvas returned an unexpected list response.');
      }

      all.push(...data);

      const link = response.headers.get('Link') || '';
      const next = link.match(/<([^>]+)>;\s*rel="next"/);
      url = next ? new URL(next[1], origin).href : '';
    }

    return all;
  }

  const course = await getJson(
    `${base}?include[]=syllabus_body&include[]=term`
  );

  const [assignments, quizzes] = await Promise.all([
    getPaged(`${base}/assignments?per_page=100`),
    getPaged(`${base}/quizzes?per_page=100`).catch(() => [])
  ]);

  const clean = (item, type) => ({
    id: item.id,
    type,
    title: item.name || item.title || 'Untitled',
    description: item.description || null,
    due_at: item.due_at || null,
    points_possible: item.points_possible ?? null,
    html_url: item.html_url || null,
    published: item.published ?? null
  });

  const syllabusHtml = course.syllabus_body || '';
  const syllabusDocument = new DOMParser().parseFromString(
    syllabusHtml,
    'text/html'
  );

  syllabusDocument
    .querySelectorAll('script,style,iframe,object,embed')
    .forEach(node => node.remove());

  return {
    collected_at: new Date().toISOString(),
    source: origin,
    course: {
      id: course.id,
      name: course.name,
      course_code: course.course_code || null,
      term: course.term?.name || null,
      start_at: course.start_at || null,
      end_at: course.end_at || null,
      html_url: course.html_url || location.href,
      syllabus_html: syllabusHtml,
      syllabus_text: syllabusDocument.body.textContent
        .replace(/\s+/g, ' ')
        .trim()
    },
    assignments: assignments.map(item => clean(item, 'assignment')),
    quizzes: quizzes.map(item => clean(item, 'quiz'))
  };
}

function render(data) {
  results.hidden = false;

  document.querySelector('#course-title').textContent =
    `${data.course.name || 'Canvas course'}${
      data.course.course_code ? ` · ${data.course.course_code}` : ''
    }`;

  document.querySelector('#counts').replaceChildren(
    ...[
      `${data.assignments.length} assignments`,
      `${data.quizzes.length} quizzes`,
      data.course.syllabus_text ? 'Syllabus found' : 'No syllabus found'
    ].map(label => {
      const element = document.createElement('span');
      element.className = 'pill';
      element.textContent = label;
      return element;
    })
  );

  const summary = [
    `Course: ${data.course.name || 'Unknown'}`,
    `Term: ${data.course.term || 'Not listed'}`,
    `Syllabus: ${data.course.syllabus_text || 'No syllabus text available'}`,
    '',
    'Assignments:',
    ...data.assignments.map(
      item => `• ${item.title}${item.due_at ? ` — due ${item.due_at}` : ''}`
    ),
    '',
    'Quizzes / tests:',
    ...data.quizzes.map(
      item => `• ${item.title}${item.due_at ? ` — due ${item.due_at}` : ''}`
    )
  ];

  document.querySelector('#preview').textContent = summary.join('\n');
}

function exportJson() {
  if (!latestData) return;

  const blob = new Blob([JSON.stringify(latestData, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const safeName = (
    latestData.course.course_code ||
    latestData.course.name ||
    'canvas-course'
  )
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  link.href = url;
  link.download = `${safeName || 'canvas-course'}-data.json`;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}