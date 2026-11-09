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

function field(form, labelText, name, value, type = 'text') {
  const label = el('label', {}, labelText);
  const input = type === 'textarea' ? el('textarea', { name }) : el('input', { name, type });
  input.value = value ?? '';
  label.append(input);
  form.append(label);
  return input;
}

function labeledControl(labelText, name, value = '', type = 'text') {
  const label = el('label', {}, labelText);
  const control = type === 'select' ? el('select', { name }) : el('input', { name, type });
  if (type === 'select') {
    [['', 'Select day'], ['0', 'Sunday'], ['1', 'Monday'], ['2', 'Tuesday'], ['3', 'Wednesday'], ['4', 'Thursday'], ['5', 'Friday'], ['6', 'Saturday']]
      .forEach(([key, text]) => control.append(el('option', { value: key }, text)));
  } else if (type === 'checkbox') control.checked = Boolean(value);
  else control.value = value ?? '';
  label.append(control);
  return label;
}

function addOfficeRow(container, value = {}) {
  const row = el('div', { class: 'entry-card office-row' });
  row.append(labeledControl('Day', 'day_of_week', value.day_of_week, 'select'));
  row.append(labeledControl('Office location', 'office_location', value.office_location));
  row.append(labeledControl('Start time', 'start_time', value.start_time, 'time'));
  row.append(labeledControl('End time', 'end_time', value.end_time, 'time'));
  row.append(labeledControl('Booking required', 'required_booking', value.required_booking, 'checkbox'));
  row.append(labeledControl('Booking link', 'booking_link', value.booking_link, 'url'));
  const remove = el('button', { class: 'secondary remove', type: 'button' }, 'Remove office hour');
  remove.addEventListener('click', () => row.remove());
  row.append(remove);
  container.append(row);
}

function addTopicRow(container, value = {}) {
  const row = el('div', { class: 'entry-card topic-row' });
  row.append(labeledControl('Topic', 'title', value.title));
  row.append(labeledControl('Percentage', 'percentage', value.percentage, 'number'));
  row.append(labeledControl('Total count (optional)', 'total_count', value.total_count, 'number'));
  const remove = el('button', { class: 'secondary remove', type: 'button' }, 'Remove topic');
  remove.addEventListener('click', () => row.remove());
  row.append(remove);
  container.append(row);
}

function render(flow) {
  content.replaceChildren();
  if (!flow?.courses?.length) {
    content.append(el('h1', {}, 'Find a class syllabus'), el('p', {}, 'On a Canvas page, choose AI Pull to start. Then navigate to a class syllabus and confirm the page here.'));
    return;
  }
  const course = flow.courses[flow.index];
  if (flow.status === 'done') {
    content.append(el('h1', {}, 'Syllabi saved'), el('p', {}, 'You have reviewed all selected classes. You can close this panel.'));
    return;
  }

  content.append(el('div', { class: 'step' }, `CLASS ${flow.index + 1} OF ${flow.courses.length}`));
  content.append(el('div', { class: 'class' }, [course.code, course.term].filter(Boolean).join(' · ') || course.name));
  if (flow.status === 'review' && flow.review) {
    renderReview(flow, course, flow.review);
    return;
  }
  if (flow.status === 'choose-source' && flow.captured) {
    content.append(el('h1', {}, 'Choose the syllabus source'), el('p', {}, 'This page has readable text and linked documents. Choose the source that contains the syllabus.'));
    if (flow.captured.text?.trim()) {
      const pageButton = el('button', { class: 'secondary' }, 'Use text on this page');
      pageButton.addEventListener('click', () => chooseSource(null, pageButton));
      content.append(pageButton);
    }
    flow.captured.attachments.forEach((attachment, index) => {
      const button = el('button', { class: 'secondary' }, `Use document: ${attachment.title || `File ${index + 1}`}`);
      button.addEventListener('click', () => chooseSource(index, button));
      content.append(button);
    });
    return;
  }

  content.append(el('h1', {}, 'Find this class’s syllabus'), el('p', {}, `Navigate to the syllabus for ${course.name}. It can be a Canvas page or a Google Docs document, including a document opened in a new tab.`));
  content.append(el('div', { class: 'note' }, 'When the syllabus itself is open, click the button below. RISE will read the visible page and prepare the fields for your review.'));
  const capture = el('button', {}, 'This is where the syllabus is');
  capture.addEventListener('click', async () => {
    capture.disabled = true;
    capture.textContent = 'Reading syllabus…';
    content.querySelector('.error')?.remove();
    try { await send('captureSyllabusPage'); }
    catch (error) { showError(error.message); capture.disabled = false; capture.textContent = 'This is where the syllabus is'; }
  });
  content.append(capture);
  const cancel = el('button', { class: 'secondary' }, 'Cancel');
  cancel.addEventListener('click', async () => { await send('cancelSyllabusSourceFlow'); render(null); });
  content.append(cancel);
}

async function chooseSource(attachmentIndex, button) {
  button.disabled = true;
  button.textContent = 'Reading source…';
  content.querySelector('.error')?.remove();
  try { await send('chooseSyllabusSource', { attachmentIndex }); }
  catch (error) { showError(error.message); button.disabled = false; button.textContent = attachmentIndex == null ? 'Use text on this page' : 'Try this document again'; }
}

function renderReview(flow, course, review) {
  const info = review.syllabusInfo ?? {};
  content.append(el('h1', {}, 'Review pulled information'), el('p', {}, `Source: ${review.sourceName || 'Selected page'} (${review.sourceType || 'page'}). Correct anything that needs editing.`));
  const form = el('form');
  field(form, 'Professor name', 'professor_name', info.professor_name);
  field(form, 'Professor email', 'professor_email', info.professor_email, 'email');
  field(form, 'Late work policy', 'late_work', info.late_work);
  field(form, 'Class location', 'class_location', info.class_location);
  const gradingLabel = el('label', {}, 'Grading method');
  const grading = el('select', { name: 'grading_method' });
  [['points', 'Points'], ['weighted_categories', 'Percentage / weighted categories'], ['other', 'Other']].forEach(([value, label]) => {
    const option = el('option', { value }, label); grading.append(option);
  });
  grading.value = info.grading_method || 'points';
  gradingLabel.append(grading); form.append(gradingLabel);
  const officeSection = el('section', { class: 'group' });
  officeSection.append(el('h2', {}, 'Office hours'));
  const officeRows = el('div');
  (info.office_hours?.length ? info.office_hours : []).forEach((item) => addOfficeRow(officeRows, item));
  officeSection.append(officeRows);
  const addOffice = el('button', { class: 'secondary', type: 'button' }, 'Add office hour');
  addOffice.addEventListener('click', () => addOfficeRow(officeRows));
  officeSection.append(addOffice);
  form.append(officeSection);

  const topicsSection = el('section', { class: 'group' });
  topicsSection.append(el('h2', {}, 'Grading topics'));
  const topicsRows = el('div');
  (info.topics?.length ? info.topics : []).forEach((item) => addTopicRow(topicsRows, item));
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
      const officeHours = [...officeRows.querySelectorAll('.office-row')].map((row) => ({
        day_of_week: row.querySelector('[name="day_of_week"]').value === '' ? null : Number(row.querySelector('[name="day_of_week"]').value),
        office_location: row.querySelector('[name="office_location"]').value.trim() || null,
        start_time: row.querySelector('[name="start_time"]').value || null,
        end_time: row.querySelector('[name="end_time"]').value || null,
        required_booking: row.querySelector('[name="required_booking"]').checked,
        booking_link: row.querySelector('[name="booking_link"]').value.trim() || null,
      }));
      const gradingTopics = [...topicsRows.querySelectorAll('.topic-row')].map((row) => ({
        title: row.querySelector('[name="title"]').value.trim(),
        percentage: row.querySelector('[name="percentage"]').value === '' ? null : Number(row.querySelector('[name="percentage"]').value),
        total_count: row.querySelector('[name="total_count"]').value === '' ? null : Number(row.querySelector('[name="total_count"]').value),
      }));
      const syllabusInfo = {
        professor_name: form.elements.professor_name.value.trim() || null,
        professor_email: form.elements.professor_email.value.trim() || null,
        late_work: form.elements.late_work.value.trim() || null,
        class_location: form.elements.class_location.value.trim() || null,
        grading_method: form.elements.grading_method.value,
        office_hours: officeHours,
        topics: gradingTopics,
      };
      if (officeHours.some((item) => item.day_of_week == null || !item.start_time || !item.end_time)) throw new Error('Each office hour needs a day, start time, and end time.');
      if (gradingTopics.some((item) => !item.title || item.percentage == null)) throw new Error('Each grading topic needs a title and percentage.');
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
