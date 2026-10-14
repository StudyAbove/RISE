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
  const syllabusDocument = new DOMParser().parseFromString(syllabusHtml, 'text/html');
  syllabusDocument.querySelectorAll('script,style,iframe,object,embed').forEach(node => node.remove());
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
      syllabus_text: syllabusDocument.body.textContent.replace(/\s+/g, ' ').trim()
    },
    assignments: assignments.map(item => clean(item, 'assignment')),
    quizzes: quizzes.map(item => clean(item, 'quiz'))
  };
}

function render(data) {
  results.hidden = false;
  document.querySelector('#course-title').textContent = `${data.course.name || 'Canvas course'}${data.course.course_code ? ` · ${data.course.course_code}` : ''}`;
  document.querySelector('#counts').replaceChildren(...[
    `${data.assignments.length} assignments`, `${data.quizzes.length} quizzes`, data.course.syllabus_text ? 'Syllabus found' : 'No syllabus found'
  ].map(label => { const el = document.createElement('span'); el.className = 'pill'; el.textContent = label; return el; }));
  const summary = [
    `Course: ${data.course.name || 'Unknown'}`,
    `Term: ${data.course.term || 'Not listed'}`,
    `Syllabus: ${data.course.syllabus_text || 'No syllabus text available'}`,
    '', 'Assignments:', ...data.assignments.map(x => `• ${x.title}${x.due_at ? ` — due ${x.due_at}` : ''}`),
    '', 'Quizzes / tests:', ...data.quizzes.map(x => `• ${x.title}${x.due_at ? ` — due ${x.due_at}` : ''}`)
  ];
  document.querySelector('#preview').textContent = summary.join('\n');
}

function exportJson() {
  if (!latestData) return;
  const blob = new Blob([JSON.stringify(latestData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = (latestData.course.course_code || latestData.course.name || 'canvas-course').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  link.href = url;
  link.download = `${safeName || 'canvas-course'}-data.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
