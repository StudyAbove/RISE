const content = document.querySelector('#content');

function send(type, values = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, ...values }, (response) => {
      if (chrome.runtime.lastError || !response) reject(new Error(chrome.runtime.lastError?.message || 'RISE did not respond.'));
      else if (!response.ok) reject(new Error(response.error || 'Something went wrong.'));
      else resolve(response.result);
    });
  });
}

function el(tag, attrs = {}, text = '') {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  if (text) node.textContent = text;
  return node;
}

function showError(message) {
  content.querySelector('.error')?.remove();
  content.append(el('div', { class: 'error', role: 'alert' }, message));
}

function makeSkipButton(className, label) {
  const button = el('button', { class: className, type: 'button' }, label);
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Skipping class…';
    content.querySelector('.error')?.remove();
    try { await send('skipSyllabusSourceFlow'); }
    catch (error) { showError(error.message); button.disabled = false; button.textContent = label; }
  });
  return button;
}

function field(form, labelText, name, value, type = 'text') {
  const label = el('label', {}, labelText);
  const input = type === 'textarea' ? el('textarea', { name }) : el('input', { name, type });
  input.value = value ?? '';
  label.append(input);
  form.append(label);
  return input;
}

function normalizeDayOfWeek(value) {
  if (Number.isInteger(value) && value >= 0 && value <= 6) return String(value);
  if (/^[0-6]$/.test(String(value ?? '').trim())) return String(value).trim();
  const day = String(value ?? '').trim().toLowerCase().replace(/[^a-z]/g, '');
  const aliases = {
    sun: '0', sunday: '0',
    mon: '1', monday: '1',
    tue: '2', tues: '2', tuesday: '2',
    wed: '3', weds: '3', wednesday: '3',
    th: '4', thu: '4', thur: '4', thurs: '4', thursday: '4',
    fri: '5', friday: '5',
    sat: '6', saturday: '6',
  };
  return aliases[day] ?? '';
}

function appendEvidence(parent, quote) {
  if (typeof quote !== 'string' || !quote.trim()) return;
  const button = el('button', { class: 'source-evidence', type: 'button', title: 'Highlight this quote on the syllabus page' });
  button.append(el('span', {}, 'Source: '), el('mark', {}, `“${quote}”`));
  button.addEventListener('click', async () => {
    button.disabled = true;
    try { await send('highlightSourceEvidence', { quote }); }
    catch (error) { showError(error.message); }
    finally { button.disabled = false; }
  });
  if (parent.tagName === 'LABEL') parent.after(button);
  else parent.append(button);
}

function labeledControl(labelText, name, value = '', type = 'text') {
  const label = el('label', {}, labelText);
  const control = type === 'select' ? el('select', { name }) : el('input', { name, type });
  if (type === 'select') {
    [['', 'Select day'], ['0', 'Sunday'], ['1', 'Monday'], ['2', 'Tuesday'], ['3', 'Wednesday'], ['4', 'Thursday'], ['5', 'Friday'], ['6', 'Saturday']]
      .forEach(([key, text]) => control.append(el('option', { value: key }, text)));
    control.value = normalizeDayOfWeek(value);
  } else if (type === 'checkbox') {
    control.checked = Boolean(value);
    label.classList.add('check-field');
    label.prepend(control);
    return label;
  } else control.value = value ?? '';
  label.append(control);
  return label;
}

function addOfficeRow(container, value = {}, evidence = '') {
  const row = el('div', { class: 'entry-card office-row' });
  row.append(labeledControl('Day', 'day_of_week', value.day_of_week, 'select'));
  row.append(labeledControl('Office location', 'office_location', value.office_location));
  row.append(labeledControl('Start time', 'start_time', value.start_time, 'time'));
  row.append(labeledControl('End time', 'end_time', value.end_time, 'time'));
  row.append(labeledControl('By appointment / booking required', 'required_booking', value.required_booking, 'checkbox'));
  row.append(el('p', { class: 'field-hint' }, 'Check this even when no booking link is available.'));
  row.append(labeledControl('Booking link', 'booking_link', value.booking_link, 'url'));
  appendEvidence(row, evidence);
  const remove = el('button', { class: 'secondary remove', type: 'button' }, 'Remove office hour');
  remove.addEventListener('click', () => row.remove());
  row.append(remove);
  container.append(row);
}

function addTopicRow(container, value = {}, evidence = '') {
  const row = el('div', { class: 'entry-card topic-row' });
  row.append(labeledControl('Topic', 'title', value.title));
  row.append(labeledControl('Percentage', 'percentage', value.percentage, 'number'));
  row.append(labeledControl('Total count (optional)', 'total_count', value.total_count, 'number'));
  appendEvidence(row, evidence);
  const remove = el('button', { class: 'secondary remove', type: 'button' }, 'Remove topic');
  remove.addEventListener('click', () => row.remove());
  row.append(remove);
  container.append(row);
}

function render(flow) {
  content.replaceChildren();
  if (!flow?.courses?.length) {
    content.append(el('h1', {}, 'Find a class syllabus'), el('p', {}, 'On a Canvas page, choose Manually Type or AI Pull to start. Then follow the prompts here.'));
    return;
  }
  const course = flow.courses[flow.index];
  if (flow.status === 'done') {
    content.append(el('h1', {}, 'Review complete'), el('p', {}, 'You have finished reviewing the selected classes. You can close this panel.'));
    if (flow.skippedCourses?.length) {
      const warning = el('section', { class: 'warning', role: 'alert' });
      warning.append(
        el('div', { class: 'warning-label' }, 'Warning'),
        el('h2', {}, 'Syllabus not found'),
        el('p', {}, 'Couldn’t find an instance of the class syllabus for:'),
      );
      const names = el('ul');
      flow.skippedCourses.forEach((skipped) => names.append(el('li', {}, skipped.name || 'Unnamed class')));
      warning.append(names);
      content.append(warning);
    }
    return;
  }

  content.append(el('div', { class: 'step' }, `CLASS ${flow.index + 1} OF ${flow.courses.length}`));
  const courseTitle = el('h1', { class: 'course-title' }, course.name);
  if (flow.mode === 'manual') {
    const titleRow = el('div', { class: 'course-title-row' });
    titleRow.append(courseTitle, makeSkipButton('manual-skip', 'Syllabus not Posted'));
    content.append(titleRow);
  } else {
    content.append(courseTitle);
  }
  if (flow.status === 'review' && flow.review) {
    renderReview(flow, course, flow.review);
    return;
  }
  if (flow.status === 'discovering') {
    content.append(el('h2', {}, 'Finding a Likely Syllabus'), el('p', {}, 'Checking this Canvas course for syllabus pages, files, and linked documents…'));
    return;
  }
  if (flow.status === 'choose-source' && flow.captured) {
    content.append(el('h2', {}, 'Choose a Syllabus Source'), el('p', {}, 'Select page text or one of the linked documents.'));
    const sourceList = el('div', { class: 'source-list' });
    if (flow.captured.text?.trim()) {
      const pageButton = el('button', { class: 'source-card source-card--button' }, 'Use text on this page');
      pageButton.addEventListener('click', () => chooseSource(null, pageButton));
      sourceList.append(pageButton);
    }
    flow.captured.attachments.slice(0, 3).forEach((attachment, index) => {
      const choice = el('div', { class: 'source-card source-card--document' });
      choice.append(el('span', { class: 'source-card-label' }, 'Use document:'));
      const link = el('a', {
        class: 'source-document-link',
        href: attachment.url,
        target: '_blank',
        rel: 'noopener noreferrer',
      }, attachment.title || `File ${index + 1}`);
      link.addEventListener('click', (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        chooseSource(index, link);
      });
      choice.append(link);
      sourceList.append(choice);
    });
    content.append(sourceList);
    return;
  }

  const suggestion = flow.status === 'confirm-source' ? flow.suggestion : null;
  if (suggestion) {
    const candidateCard = el('section', { class: 'ai-source-card' });
    candidateCard.append(el('div', { class: 'ai-source-card-title' }, suggestion.title));
    candidateCard.append(el('div', { class: 'ai-source-card-meta' }, `${suggestion.kind} · ${suggestion.confidence} confidence`));
    content.append(candidateCard, el('p', {}, 'Confirm this page, or navigate to another page in this tab.'));
  } else {
    content.append(el('p', {}, flow.homeOpened
      ? 'No likely syllabus page was found, so the Canvas course homepage is open. Find the syllabus there, or open its Google Docs document.'
      : 'Navigate to this class’s syllabus. It can be a Canvas page or Google Docs document.'));
  }
  const captureLabel = flow.mode === 'manual' ? 'Use this page for manual entry' : 'This is where the syllabus is';
  const capture = el('button', { class: 'flow-action' }, captureLabel);
  capture.addEventListener('click', async () => {
    capture.disabled = true;
    capture.textContent = flow.mode === 'manual' ? 'Opening entry fields…' : 'Reading syllabus…';
    content.querySelector('.error')?.remove();
    try { await send('captureSyllabusPage'); }
    catch (error) { showError(error.message); capture.disabled = false; capture.textContent = captureLabel; }
  });
  content.append(capture);
  if (suggestion) {
    const different = el('button', { class: 'secondary flow-action' }, 'Find a different page');
    different.addEventListener('click', async () => {
      try { await send('findDifferentSyllabusPage'); }
      catch (error) { showError(error.message); }
    });
    content.append(different);
  }
  if (flow.mode !== 'manual') {
    content.append(makeSkipButton('flow-action flow-action--not-posted', 'Not posted yet'));
  }
}

async function chooseSource(attachmentIndex, control) {
  const isButton = control instanceof HTMLButtonElement;
  const originalText = control.textContent;
  if (isButton) control.disabled = true;
  else control.setAttribute('aria-disabled', 'true');
  control.textContent = 'Reading source…';
  content.querySelector('.error')?.remove();
  try { await send('chooseSyllabusSource', { attachmentIndex }); }
  catch (error) {
    showError(error.message);
    if (isButton) control.disabled = false;
    else control.removeAttribute('aria-disabled');
    control.textContent = originalText;
  }
}

function renderReview(flow, course, review) {
  const info = review.syllabusInfo ?? {};
  const evidence = info.evidence ?? {};
  content.append(
    el('h2', {}, flow.mode === 'manual' ? 'Enter Syllabus Information' : 'Review Pulled Information'),
    el('p', {}, flow.mode === 'manual'
      ? 'Type the details from this class’s syllabus.'
      : `Source: ${review.sourceName || 'Selected page'} (${review.sourceType || 'page'}). Correct anything that needs editing.`),
  );
  const form = el('form');
  const professorName = field(form, 'Professor name', 'professor_name', info.professor_name);
  appendEvidence(professorName.closest('label'), evidence.professor_name);
  const professorEmail = field(form, 'Professor email', 'professor_email', info.professor_email, 'email');
  appendEvidence(professorEmail.closest('label'), evidence.professor_email);
  const lateWork = field(form, 'Late work policy', 'late_work', info.late_work, 'textarea');
  appendEvidence(lateWork.closest('label'), evidence.late_work);
  const classLocation = field(form, 'Class location', 'class_location', info.class_location);
  appendEvidence(classLocation.closest('label'), evidence.class_location);
  const gradingLabel = el('label', {}, 'Grading method');
  const grading = el('select', { name: 'grading_method' });
  [['points', 'Points'], ['weighted_categories', 'Percentage / weighted categories'], ['other', 'Other']].forEach(([value, label]) => {
    const option = el('option', { value }, label); grading.append(option);
  });
  grading.value = info.grading_method || 'points';
  gradingLabel.append(grading); form.append(gradingLabel); appendEvidence(gradingLabel, evidence.grading_method);
  const officeSection = el('section', { class: 'group' });
  officeSection.append(el('h2', {}, 'Office hours'));
  const officeRows = el('div');
  (info.office_hours?.length ? info.office_hours : []).forEach((item, index) => addOfficeRow(officeRows, item, evidence.office_hours?.[index]));
  officeSection.append(officeRows);
  const addOffice = el('button', { class: 'secondary', type: 'button' }, 'Add office hour');
  addOffice.addEventListener('click', () => addOfficeRow(officeRows));
  officeSection.append(addOffice);
  form.append(officeSection);

  const topicsSection = el('section', { class: 'group' });
  topicsSection.append(el('h2', {}, 'Grading topics'));
  const topicsRows = el('div');
  (info.topics?.length ? info.topics : []).forEach((item, index) => addTopicRow(topicsRows, item, evidence.topics?.[index]));
  topicsSection.append(topicsRows);
  const addTopic = el('button', { class: 'secondary', type: 'button' }, 'Add grading topic');
  addTopic.addEventListener('click', () => addTopicRow(topicsRows));
  topicsSection.append(addTopic);
  form.append(topicsSection);
  const updateTopicsVisibility = () => { topicsSection.hidden = grading.value !== 'weighted_categories'; };
  grading.addEventListener('change', updateTopicsVisibility);
  updateTopicsVisibility();
  const save = el('button', { type: 'submit' }, flowButtonLabel(flow));
  form.append(save);
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); save.disabled = true; save.textContent = 'Saving…';
    content.querySelector('.error')?.remove();
    try {
      const gradingMethod = form.elements.grading_method.value;
      const officeHours = [...officeRows.querySelectorAll('.office-row')].map((row) => ({
        day_of_week: row.querySelector('[name="day_of_week"]').value === '' ? null : Number(row.querySelector('[name="day_of_week"]').value),
        office_location: row.querySelector('[name="office_location"]').value.trim() || null,
        start_time: row.querySelector('[name="start_time"]').value || null,
        end_time: row.querySelector('[name="end_time"]').value || null,
        required_booking: row.querySelector('[name="required_booking"]').checked,
        booking_link: row.querySelector('[name="booking_link"]').value.trim() || null,
      }));
      const gradingTopics = gradingMethod === 'weighted_categories'
        ? [...topicsRows.querySelectorAll('.topic-row')].map((row) => ({
          title: row.querySelector('[name="title"]').value.trim(),
          percentage: row.querySelector('[name="percentage"]').value === '' ? null : Number(row.querySelector('[name="percentage"]').value),
          total_count: row.querySelector('[name="total_count"]').value === '' ? null : Number(row.querySelector('[name="total_count"]').value),
        }))
        : [];
      const syllabusInfo = {
        professor_name: form.elements.professor_name.value.trim() || null,
        professor_email: form.elements.professor_email.value.trim() || null,
        late_work: form.elements.late_work.value.trim() || null,
        class_location: form.elements.class_location.value.trim() || null,
        grading_method: gradingMethod,
        office_hours: officeHours,
        topics: gradingTopics,
      };
      if (officeHours.some((item) => {
        const appointmentOnly = item.required_booking && item.day_of_week == null && !item.start_time && !item.end_time;
        return !appointmentOnly && (item.day_of_week == null || !item.start_time || !item.end_time);
      })) throw new Error('Each office hour needs a day, start time, and end time, unless it is by appointment.');
      if (gradingMethod === 'weighted_categories' && gradingTopics.some((item) => !item.title || item.percentage == null)) {
        throw new Error('Each grading topic needs a title and percentage.');
      }
      await send('saveSyllabusSourceReview', { syllabusInfo });
    } catch (error) {
      showError(error.message); save.disabled = false; save.textContent = flowButtonLabel(flow);
    }
  });
  content.append(form);
}

function flowButtonLabel(flow) { return flow.index === flow.courses.length - 1 ? 'Done' : 'Save and continue'; }

async function refresh() {
  const { syllabusSourceFlow: flow, syllabusSourceError } = await chrome.storage.local.get(['syllabusSourceFlow', 'syllabusSourceError']);
  render(flow);
  if (syllabusSourceError) showError(syllabusSourceError);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.syllabusSourceFlow || changes.syllabusSourceError)) refresh();
});
refresh();
