const statusEl = document.getElementById('status');
const summaryEl = document.getElementById('summary');
const coursesEl = document.getElementById('courses');
const pullAgainButton = document.getElementById('pull-again');
const downloadButton = document.getElementById('download');
const connectionPanel = document.getElementById('connection-panel');
const pairEmailInput = document.getElementById('pair-email');
const pairCodeInput = document.getElementById('pair-code');
const pairExtensionButton = document.getElementById('pair-extension');
const connectionStatus = document.getElementById('connection-status');

let pullResult = null;
// Local Supabase URL for the standalone syllabus prototype.
const SUPABASE_URL = 'http://127.0.0.1:54321';
let connection = { token: null };

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('status--error', isError);
}

function setConnectionStatus(message, isError = false) {
  connectionStatus.textContent = message;
  connectionStatus.classList.toggle('connection-status--error', isError);
}

async function loadConnection() {
  const saved = await chrome.storage.local.get([
    'syllabusExtensionToken',
  ]);
  connection = { token: saved.syllabusExtensionToken || null };
  if (connection.token) {
    setConnectionStatus('RISE account connected. AI extraction results will be stored in Supabase.');
    connectionPanel.open = false;
  } else {
    connectionPanel.open = true;
    setConnectionStatus('Enter your RISE email and the pairing code shown in the RISE app.');
  }
  if (pullResult) renderCourses(pullResult.courses);
}

async function pairExtension() {
  pairExtensionButton.disabled = true;
  setConnectionStatus('Connecting to your RISE account…');
  try {
    const email = pairEmailInput.value.trim();
    const code = pairCodeInput.value.trim();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/canvas-extension`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pair', email, code }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Could not connect to your RISE account.');
    if (!body.token) throw new Error('RISE did not return an extension token. Try pairing again.');
    connection = { token: body.token };
    await chrome.storage.local.set({ syllabusExtensionToken: body.token });
    setConnectionStatus('RISE account connected. AI extraction results will be stored in Supabase.');
    connectionPanel.open = false;
    if (pullResult) renderCourses(pullResult.courses);
  } catch (error) {
    setConnectionStatus(error.message || 'Could not connect to your RISE account.', true);
  } finally {
    pairExtensionButton.disabled = false;
  }
}

function renderCourses(courses) {
  coursesEl.replaceChildren();

  for (const course of courses) {
    const card = document.createElement('article');
    card.className = 'course';

    const heading = document.createElement('div');
    heading.className = 'course-heading';
    const nameWrap = document.createElement('div');
    const name = document.createElement('h2');
    name.className = 'course-name';
    name.textContent = course.name;
    const meta = document.createElement('p');
    meta.className = 'course-meta';
    meta.textContent = [course.code, course.term].filter(Boolean).join(' · ') || `Canvas course ${course.canvasCourseId}`;
    nameWrap.append(name, meta);

    const badge = document.createElement('span');
    badge.className = `badge${course.hasSyllabus ? '' : ' badge--empty'}`;
    badge.textContent = course.hasSyllabus
      ? `${course.syllabusText.length.toLocaleString()} chars`
      : 'No syllabus text';
    heading.append(nameWrap, badge);
    card.append(heading);
    card.append(createManualSyllabusForm(course));

    if (course.hasSyllabus) {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = 'View pulled syllabus text';
      const text = document.createElement('pre');
      text.className = 'syllabus-text';
      text.textContent = course.syllabusText;
      details.append(summary, text);
      card.append(details);

      const textActions = document.createElement('div');
      textActions.className = 'document-actions';
      const parseTextButton = document.createElement('button');
      parseTextButton.className = 'button';
      parseTextButton.type = 'button';
      parseTextButton.textContent = course.textExtraction ? 'Text parsed and saved' : 'Parse syllabus text with AI';
      parseTextButton.disabled = Boolean(course.textExtraction) || !connection.token;
      parseTextButton.addEventListener('click', () => parseSyllabusText(course, parseTextButton));
      textActions.append(parseTextButton);
      card.append(textActions);

      if (course.textExtraction) {
        const extracted = document.createElement('pre');
        extracted.className = 'document-extraction';
        extracted.textContent = `Saved run ${course.textExtraction.runId}\n${JSON.stringify(course.textExtraction.syllabusInfo, null, 2)}`;
        card.append(extracted);
      }
    }

    if (course.documentSearch?.attempted) {
      const fallback = document.createElement('section');
      fallback.className = 'document-search';
      const heading = document.createElement('p');
      heading.className = 'document-search-heading';
      heading.textContent = `Syllabus tab text is under 3,000 characters (${course.syllabusText.length}). Searched module topics for “syllabus”.`;
      fallback.append(heading);

      if (course.documentSearch.error) {
        const error = document.createElement('p');
        error.className = 'document-search-empty';
        error.textContent = course.documentSearch.error;
        fallback.append(error);
      } else if (course.documentSearch.files.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'document-search-empty';
        empty.textContent = 'No syllabus topic was found in the course modules.';
        fallback.append(empty);
      } else {
        const list = document.createElement('ul');
        list.className = 'document-list';
        for (const file of course.documentSearch.files) {
          const item = document.createElement('li');
          const link = document.createElement('a');
          link.href = file.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = file.name;
          item.append(link);
          const kind = [file.type, file.contentType].filter(Boolean).join(' · ');
          if (kind) {
            const type = document.createElement('span');
            type.className = 'document-type';
            type.textContent = kind;
            item.append(type);
          }
          if (file.text) {
            const preview = document.createElement('details');
            const previewLabel = document.createElement('summary');
            previewLabel.textContent = 'View module page text';
            const pageText = document.createElement('pre');
            pageText.className = 'syllabus-text';
            pageText.textContent = file.text;
            preview.append(previewLabel, pageText);
            item.append(preview);
            const pageParseButton = document.createElement('button');
            pageParseButton.className = 'button';
            pageParseButton.type = 'button';
            pageParseButton.textContent = file.extracted ? 'Page text parsed and saved' : 'Parse page text with AI';
            pageParseButton.disabled = Boolean(file.extracted) || !connection.token;
            pageParseButton.addEventListener('click', () => parseSyllabusText(course, pageParseButton, file.text, file.name, file));
            item.append(pageParseButton);
          }
          if (file.type === 'File' && file.canvasFileId) {
            const actions = document.createElement('div');
            actions.className = 'document-actions';
            const parseButton = document.createElement('button');
            parseButton.className = 'button';
            parseButton.type = 'button';
            parseButton.textContent = file.extracted ? 'Parsed and saved' : 'Parse document with AI';
            parseButton.disabled = Boolean(file.extracted) || !connection.token;
            parseButton.addEventListener('click', () => parseCanvasDocument(course, file, parseButton));
            actions.append(parseButton);
            if (!connection.token) {
              const connectHint = document.createElement('span');
              connectHint.className = 'document-type';
              connectHint.textContent = 'Connect your RISE account above first.';
              actions.append(connectHint);
            }
            item.append(actions);
          }
          if (file.extracted) {
            const extracted = document.createElement('pre');
            extracted.className = 'document-extraction';
            extracted.textContent = `Saved run ${file.runId}\n${JSON.stringify(file.extracted, null, 2)}`;
            item.append(extracted);
          }
          list.append(item);
        }
        fallback.append(list);
      }

      card.append(fallback);
    }

    coursesEl.append(card);
  }
}

function createManualSyllabusForm(course) {
  const details = document.createElement('details');
  details.className = 'manual-syllabus';
  const summary = document.createElement('summary');
  summary.textContent = 'Enter syllabus details manually';
  details.append(summary);

  const form = document.createElement('form');
  form.className = 'manual-form';
  form.addEventListener('submit', (event) => event.preventDefault());
  const field = (labelText, name, type = 'text') => {
    const label = document.createElement('label');
    label.textContent = labelText;
    const input = type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
    if (type !== 'textarea') input.type = type;
    input.name = name;
    label.append(input);
    return { label, input };
  };

  const professor = field('Professor last name', 'professor_name');
  const email = field('Professor email', 'professor_email', 'email');
  const lateWork = field('Late-work policy', 'late_work', 'textarea');
  const classLocation = field('Class location', 'class_location');
  const gradingLabel = document.createElement('label');
  gradingLabel.textContent = 'Grading mode';
  const gradingMethod = document.createElement('select');
  gradingMethod.name = 'grading_method';
  for (const [value, label] of [['points', 'Points'], ['weighted_categories', 'Weighted categories']]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    gradingMethod.append(option);
  }
  gradingLabel.append(gradingMethod);
  form.append(professor.label, email.label, lateWork.label, classLocation.label, gradingLabel);

  const hours = document.createElement('fieldset');
  const hoursLegend = document.createElement('legend');
  hoursLegend.textContent = 'Office hours';
  const hoursRows = document.createElement('div');
  hoursRows.className = 'manual-rows';
  const addHours = document.createElement('button');
  addHours.type = 'button';
  addHours.className = 'button button--secondary';
  addHours.textContent = 'Add office-hours instance';
  const addHourRow = () => {
    const row = document.createElement('fieldset');
    row.className = 'manual-row manual-office-hour';
    const legend = document.createElement('legend');
    legend.textContent = `Office-hours instance ${hoursRows.children.length + 1}`;
    const day = document.createElement('select');
    day.setAttribute('aria-label', 'Office-hour day');
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].forEach((name, index) => {
      const option = document.createElement('option'); option.value = String(index); option.textContent = name; day.append(option);
    });
    const start = document.createElement('input'); start.type = 'time'; start.setAttribute('aria-label', 'Start time');
    const end = document.createElement('input'); end.type = 'time'; end.setAttribute('aria-label', 'End time');
    const location = document.createElement('input'); location.type = 'text'; location.placeholder = 'Office location or Virtual'; location.setAttribute('aria-label', 'Office location');
    const required = document.createElement('input'); required.type = 'checkbox'; required.setAttribute('aria-label', 'Booking required');
    const link = document.createElement('input'); link.type = 'url'; link.placeholder = 'Booking link (optional)'; link.setAttribute('aria-label', 'Booking link');
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove'; remove.className = 'button button--secondary';
    remove.addEventListener('click', () => {
      row.remove();
      [...hoursRows.children].forEach((item, index) => {
        item.querySelector('legend').textContent = `Office-hours instance ${index + 1}`;
      });
    });
    row.append(legend, day, start, end, location, required, link, remove); hoursRows.append(row);
  };
  addHours.addEventListener('click', addHourRow);
  hours.append(hoursLegend, hoursRows, addHours);

  const topics = document.createElement('fieldset');
  topics.hidden = true;
  const topicsLegend = document.createElement('legend'); topicsLegend.textContent = 'Grading topics';
  const topicRows = document.createElement('div'); topicRows.className = 'manual-rows';
  const addTopic = document.createElement('button'); addTopic.type = 'button'; addTopic.className = 'button button--secondary'; addTopic.textContent = 'Add grading topic';
  addTopic.addEventListener('click', () => {
    const row = document.createElement('div'); row.className = 'manual-row';
    const title = document.createElement('input'); title.placeholder = 'Topic'; title.setAttribute('aria-label', 'Grading topic');
    const percentage = document.createElement('input'); percentage.type = 'number'; percentage.min = '0'; percentage.max = '100'; percentage.step = '0.01'; percentage.placeholder = '%'; percentage.setAttribute('aria-label', 'Percentage worth');
    const count = document.createElement('input'); count.type = 'number'; count.min = '1'; count.step = '1'; count.placeholder = 'Count'; count.setAttribute('aria-label', 'Number of assignments');
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove'; remove.className = 'button button--secondary'; remove.addEventListener('click', () => row.remove());
    row.append(title, percentage, count, remove); topicRows.append(row);
  });
  topics.append(topicsLegend, topicRows, addTopic);
  gradingMethod.addEventListener('change', () => {
    topics.hidden = gradingMethod.value !== 'weighted_categories';
  });

  const save = document.createElement('button'); save.type = 'button'; save.className = 'button'; save.textContent = 'Save manual details';
  const message = document.createElement('p'); message.className = 'manual-status'; message.setAttribute('role', 'status');
  save.addEventListener('click', async () => {
    if (!connection.token) { message.textContent = 'Connect your RISE account first.'; return; }
    save.disabled = true; message.textContent = 'Saving…';
    const info = {
      professor_name: professor.input.value.trim() || null,
      professor_email: email.input.value.trim() || null,
      late_work: lateWork.input.value.trim() || null,
      class_location: classLocation.input.value.trim() || null,
      grading_method: gradingMethod.value,
      office_hours: [...hoursRows.children].map((row) => {
        const [day, start, end, location, required, link] = row.querySelectorAll('select,input');
        return { day_of_week: Number(day.value), start_time: start.value || null, end_time: end.value || null, office_location: location.value.trim() || null, required_booking: required.checked, booking_link: link.value.trim() || null };
      }).filter((item) => item.start_time || item.end_time || item.office_location || item.booking_link),
      topics: gradingMethod.value === 'weighted_categories' ? [...topicRows.children].map((row) => {
        const [title, percentage, count] = row.querySelectorAll('input');
        return { title: title.value.trim(), percentage: percentage.value === '' ? null : Number(percentage.value), total_count: count.value === '' ? null : Number(count.value) };
      }).filter((item) => item.title) : [],
    };
    try {
      await syncCourseToRise(course);
      const response = await fetch(`${SUPABASE_URL}/functions/v1/canvas-extension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-rise-extension-token': connection.token },
        body: JSON.stringify({ action: 'saveManualSyllabus', courseCode: course.code, syllabusInfo: info }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not save manual syllabus details.');
      message.textContent = 'Manual syllabus details saved.';
      course.manualSaved = true;
    } catch (error) {
      message.textContent = error.message || 'Could not save manual syllabus details.';
    } finally { save.disabled = false; }
  });
  form.append(hours, topics, save, message);
  details.append(form);
  return details;
}

async function pullSyllabi() {
  pullAgainButton.disabled = true;
  downloadButton.hidden = true;
  summaryEl.hidden = true;
  coursesEl.replaceChildren();
  pullResult = null;
  setStatus('Reading active Canvas classes and pulling each syllabus…');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error('Open Canvas in the active tab, then try again.');
    }

    const execution = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: async () => {
        const MAX_PAGES = 100;
        const origin = location.origin;
        const collected = [];
        let nextUrl = new URL(
          '/api/v1/courses?enrollment_state=active&include[]=term&include[]=syllabus_body&per_page=100',
          origin,
        );
        let pageCount = 0;

        function htmlToText(html) {
          if (!html) return '';
          const documentFromHtml = new DOMParser().parseFromString(html, 'text/html');
          documentFromHtml.querySelectorAll('script, style').forEach((element) => element.remove());
          return (documentFromHtml.body.textContent || '').replace(/\s+/g, ' ').trim();
        }

        function nextPage(response) {
          const nextLink = (response.headers.get('Link') || '').split(',').find((link) => /rel="next"/.test(link));
          const match = nextLink?.match(/<([^>]+)>/);
          return match ? new URL(match[1], origin) : null;
        }

        async function fetchCanvasArray(startUrl, maxPages, label) {
          const values = [];
          let url = startUrl;
          let pageCount = 0;
          while (url && pageCount < maxPages) {
            if (url.origin !== origin) throw new Error(`Canvas returned a ${label} page outside this site.`);
            const response = await fetch(url.href, {
              credentials: 'include',
              headers: { Accept: 'application/json' },
            });
            if (!response.ok) throw new Error(`Canvas could not read ${label} (HTTP ${response.status}).`);
            const page = await response.json().catch(() => null);
            if (!Array.isArray(page)) throw new Error(`Canvas returned an invalid ${label} list.`);
            values.push(...page);
            pageCount += 1;
            url = nextPage(response);
          }
          if (url) throw new Error(`Canvas returned more ${label} pages than the search limit.`);
          return values;
        }

        async function fetchCanvasObject(url, label) {
          if (url.origin !== origin) throw new Error(`Canvas returned a ${label} outside this site.`);
          const response = await fetch(url.href, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          });
          if (!response.ok) throw new Error(`Canvas could not read ${label} (HTTP ${response.status}).`);
          return await response.json();
        }

        function safeHttpsUrl(value) {
          try {
            const url = new URL(value, origin);
            return url.protocol === 'https:' ? url.href : null;
          } catch {
            return null;
          }
        }

        async function searchSyllabusModules(courseId) {
          const modulesUrl = new URL(`/api/v1/courses/${encodeURIComponent(courseId)}/modules`, origin);
          modulesUrl.searchParams.append('include[]', 'items');
          modulesUrl.searchParams.set('search_term', 'syllabus');
          modulesUrl.searchParams.set('per_page', '100');
          const modules = await fetchCanvasArray(modulesUrl, 20, 'syllabus modules');
          const matches = new Map();

          for (const module of modules) {
            let items = Array.isArray(module.items) ? module.items : null;
            if (!items) {
              const itemsUrl = new URL(
                `/api/v1/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(module.id)}/items`,
                origin,
              );
              itemsUrl.searchParams.set('per_page', '100');
              items = await fetchCanvasArray(itemsUrl, 20, 'module items');
            }

            for (const item of items) {
              if (!/syllabus/i.test(item?.title || '')) continue;
              const match = {
                name: item.title,
                type: item.type || 'Module item',
                url: safeHttpsUrl(item.html_url),
                contentType: null,
                text: null,
                canvasFileId: item.type === 'File' && item.content_id != null ? String(item.content_id) : null,
              };

              if (item.type === 'Page' && item.page_url) {
                const pageUrl = new URL(
                  `/api/v1/courses/${encodeURIComponent(courseId)}/pages/${encodeURIComponent(item.page_url)}`,
                  origin,
                );
                try {
                  const page = await fetchCanvasObject(pageUrl, 'syllabus page');
                  match.name = page.title || match.name;
                  match.text = htmlToText(page.body);
                  match.url = safeHttpsUrl(item.html_url) || safeHttpsUrl(`/courses/${courseId}/pages/${encodeURIComponent(item.page_url)}`);
                  match.contentType = 'Canvas page';
                } catch {
                  // Keep the module item link so the student can open it in Canvas.
                }
              } else if (item.type === 'File' && item.content_id != null) {
                const fileUrl = new URL(
                  `/api/v1/courses/${encodeURIComponent(courseId)}/files/${encodeURIComponent(item.content_id)}`,
                  origin,
                );
                try {
                  const file = await fetchCanvasObject(fileUrl, 'syllabus file');
                  match.name = file.display_name || match.name;
                  match.url = safeHttpsUrl(file.url) || match.url;
                  match.contentType = file['content-type'] || file.content_type || null;
                  match.canvasFileId = String(file.id || item.content_id);
                } catch {
                  // Keep the module item link so the student can open it in Canvas.
                }
              } else if (item.type === 'ExternalUrl') {
                match.url = safeHttpsUrl(item.external_url) || match.url;
              }

              if (match.url) matches.set(`${module.id}:${item.id}`, match);
            }
          }

          return [...matches.values()];
        }

        while (nextUrl && pageCount < MAX_PAGES) {
          if (nextUrl.origin !== origin) {
            throw new Error('Canvas returned a page outside the current Canvas site.');
          }

          const response = await fetch(nextUrl.href, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          });

          if (response.status === 401 || response.redirected) {
            throw new Error('Sign in to Canvas in this tab, then open the prototype again.');
          }
          if (!response.ok) {
            throw new Error(`Canvas could not return courses (HTTP ${response.status}).`);
          }

          const page = await response.json().catch(() => null);
          if (!Array.isArray(page)) {
            throw new Error('This tab did not return Canvas course data. Open a signed-in Canvas page and try again.');
          }

          for (const course of page) {
            if (!course?.name || course.access_restricted_by_date) continue;
            const syllabusText = htmlToText(course.syllabus_body);
            let documentSearch = null;
            if (syllabusText.length < 3000) {
              documentSearch = { attempted: true, files: [], error: null };
              try {
                documentSearch.files = await searchSyllabusModules(course.id);
              } catch (error) {
                documentSearch.error = error.message || 'Could not search this course’s syllabus modules.';
              }
            }
            collected.push({
              canvasCourseId: String(course.id),
              name: course.name,
              code: course.course_code || null,
              term: course.term?.name || null,
              hasSyllabus: Boolean(syllabusText),
              syllabusText,
              documentSearch,
            });
          }

          pageCount += 1;
          const links = (response.headers.get('Link') || '').split(',');
          const nextLink = links.find((link) => /rel="next"/.test(link));
          nextUrl = nextLink ? new URL(nextLink.match(/<([^>]+)>/)[1], origin) : null;
        }

        if (nextUrl) {
          throw new Error('Canvas returned more pages than the prototype limit. No partial results were kept.');
        }

        return { canvasOrigin: origin, courses: collected };
      },
    });

    const result = execution[0]?.result;
    if (!result || !Array.isArray(result.courses)) {
      throw new Error('Canvas did not return course data.');
    }

    pullResult = { ...result, pulledAt: new Date().toISOString() };
    const syllabusCount = result.courses.filter((course) => course.hasSyllabus).length;
    setStatus('Pull complete.');
    summaryEl.textContent = `${result.courses.length} active classes · ${syllabusCount} syllabi found`;
    summaryEl.hidden = false;
    renderCourses(result.courses);
    downloadButton.hidden = result.courses.length === 0;
    if (result.courses.length === 0) {
      setStatus('No active Canvas classes were found.');
    }
  } catch (error) {
    setStatus(error.message || 'Could not read Canvas. Check that you are signed in and try again.', true);
  } finally {
    pullAgainButton.disabled = false;
  }
}

function downloadJson() {
  if (!pullResult) return;
  const blob = new Blob([JSON.stringify(pullResult, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `rise-canvas-syllabi-${date}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const parts = [];
  const chunkSize = 0x8000;
  for (let offset = 0; offset < binary.length; offset += chunkSize) {
    const slice = binary.slice(offset, offset + chunkSize);
    const bytes = new Uint8Array(slice.length);
    for (let index = 0; index < slice.length; index += 1) bytes[index] = slice.charCodeAt(index);
    parts.push(bytes);
  }
  return new Blob(parts, { type: mimeType });
}

async function syncCourseToRise(course) {
  if (!connection.token) throw new Error('Connect your RISE account before syncing this course.');
  const canvasDomain = new URL(pullResult.canvasOrigin).hostname;
  const response = await fetch(`${SUPABASE_URL}/functions/v1/canvas-extension`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rise-extension-token': connection.token,
    },
    body: JSON.stringify({
      action: 'courses',
      canvasDomain,
      courses: [{
        id: course.canvasCourseId,
        name: course.name,
        code: course.code,
        term: course.term,
      }],
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'RISE could not sync this course.');
}

async function parseCanvasDocument(course, file, button) {
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Downloading…';
  setStatus(`Fetching ${file.name} from Canvas…`);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('Open the signed-in Canvas tab and try again.');
    await syncCourseToRise(course);

    const [download] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      args: [course.canvasCourseId, file.canvasFileId, 8 * 1024 * 1024],
      func: async (courseId, fileId, maxBytes) => {
        const origin = location.origin;
        const metadataUrl = new URL(
          `/api/v1/courses/${encodeURIComponent(courseId)}/files/${encodeURIComponent(fileId)}`,
          origin,
        );
        const metadataResponse = await fetch(metadataUrl.href, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!metadataResponse.ok) throw new Error(`Canvas could not read the file (HTTP ${metadataResponse.status}).`);
        const metadata = await metadataResponse.json();
        const downloadUrl = new URL(metadata.url, origin);
        if (downloadUrl.protocol !== 'https:') throw new Error('Canvas returned an insecure file link.');

        // The signed Canvas file URL may point to object storage; only send
        // Canvas cookies when the download remains on the Canvas origin.
        const fileResponse = await fetch(downloadUrl.href, { credentials: 'same-origin' });
        if (!fileResponse.ok) throw new Error(`Canvas could not download the file (HTTP ${fileResponse.status}).`);
        const blob = await fileResponse.blob();
        if (blob.size === 0) throw new Error('The Canvas document is empty.');
        if (blob.size > maxBytes) throw new Error('This prototype accepts documents up to 8 MB.');

        const filename = metadata.display_name || metadata.filename || `syllabus-${fileId}`;
        const extension = filename.toLowerCase().split('.').pop();
        const mimeType = extension === 'pdf'
          ? 'application/pdf'
          : extension === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : '';
        if (!mimeType) throw new Error('Only PDF and DOCX syllabus documents can be parsed.');

        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        const chunkSize = 0x8000;
        for (let offset = 0; offset < bytes.length; offset += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
        }
        return { filename, mimeType, size: bytes.length, base64: btoa(binary) };
      },
    });

    if (!download?.result?.base64) throw new Error('Canvas did not return the document contents.');
    button.textContent = 'Sending to AI…';
    setStatus(`Sending ${download.result.filename} to Supabase for extraction…`);

    const documentBlob = base64ToBlob(download.result.base64, download.result.mimeType);
    const form = new FormData();
    form.set('canvasCourseId', course.canvasCourseId);
    form.set('courseCode', course.code || '');
    form.set('courseName', course.name);
    form.set('file', documentBlob, download.result.filename);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/canvas-extension`, {
      method: 'POST',
      headers: {
        'x-rise-extension-token': connection.token,
        'x-rise-extension-action': 'prototypeExtractSyllabusDocument',
      },
      body: form,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'RISE could not parse the document.');

    file.extracted = body.syllabusInfo;
    file.runId = body.run?.id;
    setStatus(`Parsed ${download.result.filename} and saved it in Supabase as run ${file.runId}.`);
    renderCourses(pullResult.courses);
  } catch (error) {
    setStatus(error.message || 'Could not parse this Canvas document.', true);
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

async function parseSyllabusText(course, button, text = course.syllabusText, sourceName = null, resultTarget = course) {
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Sending to AI…';
  setStatus(`Sending syllabus text for ${course.name} to Supabase…`);

  try {
    await syncCourseToRise(course);
    const response = await fetch(`${SUPABASE_URL}/functions/v1/canvas-extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rise-extension-token': connection.token,
      },
      body: JSON.stringify({
        action: 'prototypeExtractSyllabusText',
        canvasCourseId: course.canvasCourseId,
        courseCode: course.code,
        courseName: course.name,
        sourceName,
        syllabusText: text,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Supabase could not parse this syllabus text.');

    resultTarget.extracted = body.syllabusInfo;
    resultTarget.runId = body.run?.id;
    if (resultTarget === course) {
      course.textExtraction = { syllabusInfo: body.syllabusInfo, runId: body.run?.id };
    }
    setStatus(`Parsed syllabus text and saved it in Supabase as run ${body.run?.id}.`);
    renderCourses(pullResult.courses);
  } catch (error) {
    setStatus(error.message || 'Could not parse syllabus text.', true);
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

pullAgainButton.addEventListener('click', pullSyllabi);
downloadButton.addEventListener('click', downloadJson);
pairExtensionButton.addEventListener('click', pairExtension);
void loadConnection();
pullSyllabi();
