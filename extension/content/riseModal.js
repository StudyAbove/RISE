// The Rise pop-ups shown on Canvas, from the Figma extension frames:
// note → "Plan your best semester" → sign in → choose classes → connected.
//
// Figma's sign-in screen sends a magic link. Rise instead asks for the email
// plus the 6-digit code from the app (Settings → Canvas), so the email is only
// compared with the account, never stored again, and nobody can connect to a
// classmate's account by typing their email.

/* exported RiseModal */
/* global COURSE_COLORS, sendToRise */
const RiseModal = (() => {
  // Placeholder numbers from the Figma design. Update before publishing.
  const STUDENT_COUNT = '45,000+';
  const RATING = '4.8';

  const asset = (path) => chrome.runtime.getURL(path);

  const STARS = Array.from({ length: 5 }, () => `<img src="${asset('images/star.svg')}" alt="">`).join('');

  const screens = {
    note: () => `
      <div class="dialog dialog--note" role="dialog" aria-modal="true" aria-labelledby="rise-title">
        <div class="brand"><img src="${asset('images/rise-logo.svg')}" alt="">Rise</div>
        <h2 class="title title--note" id="rise-title">A note from the Rise team</h2>

        <div class="note-grid">
          <div class="note">
            <p>hey! we built Rise because school felt overwhelming and we needed something that actually helped us plan 📚</p>
            <p>Rise pulls your Canvas assignments automatically and turns them into a real daily plan — so you always know what to focus on.</p>
            <p>it's free to use. we just care about helping students actually stay on top of things.</p>
            <p>seriously, thank you for being here ☀️</p>
            <p>— the Rise team</p>
          </div>

          <div class="planner-card">
            <img src="${asset('images/rise-sun.svg')}" alt="">
            <div>
              <p class="planner-name">Rise Planner</p>
              <div class="stars">${STARS}</div>
              <p class="planner-count">${STUDENT_COUNT} students</p>
            </div>
          </div>
        </div>

        <button class="button button--gold" type="button" data-action="continue">Continue to Rise →</button>
      </div>`,

    welcome: () => `
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="rise-title">
        <button class="close-button" type="button" data-action="close" aria-label="Close">
          <img src="${asset('images/close.svg')}" alt="">
        </button>

        <div class="brand"><img src="${asset('images/rise-logo.svg')}" alt="">Rise</div>
        <h2 class="title" id="rise-title">Plan your best semester</h2>
        <p class="subtitle">Sign in with the same email you use on the Rise mobile app to keep everything in sync.</p>

        <div class="social-proof">
          <div class="avatars" aria-hidden="true">
            <span class="avatar" style="background:#7c3aed">J</span>
            <span class="avatar" style="background:#e31837">A</span>
            <span class="avatar" style="background:#1565c0">S</span>
          </div>
          <p class="loved">Loved by ${STUDENT_COUNT} students</p>
          <span class="divider"></span>
          <div class="rating">
            <div class="stars">${STARS}</div>
            <p>${RATING} rating</p>
          </div>
        </div>

        <button class="button button--dark" type="button" data-action="continue">
          <img src="${asset('images/mail-white.svg')}" alt="">Continue with Email
        </button>

        <p class="legal">By continuing, you accept Rise's <span>Terms of Service</span> and <span>Privacy Policy</span></p>
      </div>`,

    signIn: () => `
      <form class="dialog" role="dialog" aria-modal="true" aria-labelledby="rise-title" novalidate>
        <button class="close-button" type="button" data-action="close" aria-label="Close">
          <img src="${asset('images/close.svg')}" alt="">
        </button>

        <div class="brand brand--start"><img src="${asset('images/rise-logo.svg')}" alt="">Rise</div>
        <h2 class="title title--start" id="rise-title">Enter your email</h2>
        <p class="subtitle subtitle--start">No password needed. Use the same email as your Rise mobile app, plus the code from Settings → Canvas in the app.</p>

        <div class="field">
          <label for="rise-email">Email address</label>
          <div class="input">
            <img src="${asset('images/mail.svg')}" alt="">
            <input id="rise-email" name="email" type="email" autocomplete="email" placeholder="you@csulb.edu" required>
          </div>
        </div>

        <div class="field">
          <label for="rise-code">Connection code</label>
          <div class="input input--code">
            <input id="rise-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" required>
          </div>
        </div>

        <p class="hint">💡 Must match the email on your Rise phone app</p>
        <p class="error" role="alert" hidden></p>

        <button class="button button--gold" type="submit">Connect →</button>
      </form>`,

    classes: ({ isSetup }) => `
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="rise-title">
        ${isSetup ? '' : `<button class="close-button" type="button" data-action="close" aria-label="Close">
          <img src="${asset('images/close.svg')}" alt="">
        </button>`}

        <div class="brand brand--start"><img src="${asset('images/rise-logo.svg')}" alt="">Rise</div>
        <h2 class="title title--start" id="rise-title">Choose your classes</h2>
        <p class="subtitle subtitle--start">Pick the classes Rise should sync and a color for each. Their assignments show in that color everywhere in Rise.</p>

        <div class="class-list" data-slot="classes">
          <p class="class-list-message">Finding your classes…</p>
        </div>

        <p class="error" role="alert" hidden></p>

        <button class="button button--gold" type="button" data-action="save" disabled>
          ${isSetup ? 'Start syncing →' : 'Save'}
        </button>
      </div>`,

    connected: () => `
      <div class="dialog dialog--centered" role="dialog" aria-modal="true" aria-labelledby="rise-title">
        <div class="tile"><img src="${asset('images/rise-logo.svg')}" alt=""></div>
        <h2 class="title title--large" id="rise-title">You're connected!</h2>
        <p class="lead">Rise is syncing Canvas for</p>
        <p class="email" data-slot="email"></p>
        <p class="info-box" data-slot="status" role="status">📚 Importing your courses and assignments…</p>
        <button class="link-button" type="button" data-action="close">Done</button>
      </div>`,

    syllabusReview: ({ index, total }) => `
      <form class="dialog dialog--review" role="dialog" aria-modal="true" aria-labelledby="rise-title" novalidate>
        <div class="brand brand--start"><img src="${asset('images/rise-logo.svg')}" alt="">Rise</div>
        <p class="review-progress" data-slot="progress"></p>
        <h2 class="title title--start" id="rise-title">Review class information</h2>
        <p class="subtitle subtitle--start" data-slot="course-name"></p>
        <p class="review-note" data-slot="syllabus-note"></p>

        <div class="review-grid">
          <label class="review-field">Professor name
            <input name="professorName" maxlength="100" placeholder="Unavailable">
          </label>
          <label class="review-field">Professor email
            <input name="professorEmail" type="email" maxlength="100" placeholder="Unavailable">
          </label>
        </div>

        <section class="review-section">
          <div class="review-section-heading"><h3>Office hours</h3><button class="small-button" type="button" data-action="add-office-hour">Add time</button></div>
          <div class="review-rows" data-slot="office-hours"></div>
        </section>

        <label class="review-field">Grading mode
          <select name="gradingMode"><option value="points">Points</option><option value="weighted_categories">Weighted categories</option></select>
        </label>
        <section class="review-section">
          <div class="review-section-heading"><h3>Grading percentages</h3><button class="small-button" type="button" data-action="add-topic">Add topic</button></div>
          <div class="review-rows" data-slot="topics"></div>
        </section>

        <label class="review-field">Late-work policy
          <textarea name="lateWork" placeholder="Unavailable — add or correct the policy"></textarea>
        </label>

        <p class="error" role="alert" hidden></p>
        <button class="button button--gold" type="submit">Confirm and continue</button>
      </form>`,
  };

  let host = null;
  let shadow = null;

  /** Canvas pages may block outside fonts, so Inter is loaded from the extension. */
  function loadFonts() {
    if (document.getElementById('rise-fonts')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'rise-fonts';
    style.textContent = [400, 600, 700]
      .map((weight) => {
        const file = { 400: 'Regular', 600: 'SemiBold', 700: 'Bold' }[weight];
        return `@font-face { font-family: 'Rise Inter'; font-weight: ${weight}; src: url('${asset(`fonts/Inter-${file}.ttf`)}') format('truetype'); }`;
      })
      .join('\n');
    document.head.append(style);
  }

  function ensureHost() {
    if (host) {
      return;
    }

    loadFonts();

    host = document.createElement('div');
    host.id = 'rise-canvas-sync';
    // Above Canvas's own headers and menus.
    host.style.cssText = 'position: fixed; z-index: 2147483647; inset: auto;';
    shadow = host.attachShadow({ mode: 'open' });

    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = asset('content/riseModal.css');
    shadow.append(stylesheet);

    document.body.append(host);
  }

  function close() {
    shadow?.querySelector('.overlay')?.remove();
    document.removeEventListener('keydown', handleKeydown, true);
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      close();
    }
  }

  function render(name, options = {}) {
    ensureHost();
    close();

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = screens[name](options);
    shadow.append(overlay);

    document.addEventListener('keydown', handleKeydown, true);

    // Moves keyboard and screen reader focus into the pop-up.
    const dialog = overlay.querySelector('[role="dialog"]');
    dialog.tabIndex = -1;
    (overlay.querySelector('input') || dialog).focus();

    return overlay;
  }

  function showNote({ onSeen, onConnected }) {
    const overlay = render('note');

    overlay.querySelector('[data-action="continue"]').addEventListener('click', () => {
      onSeen();
      showWelcome({ onConnected });
    });
  }

  function showWelcome({ onConnected }) {
    const overlay = render('welcome');

    overlay.querySelector('[data-action="close"]').addEventListener('click', close);
    overlay.querySelector('[data-action="continue"]').addEventListener('click', () => {
      showSignIn({ onConnected });
    });
  }

  function showSignIn({ onConnected }) {
    const overlay = render('signIn');
    const form = overlay.querySelector('form');
    const emailInput = form.elements.email;
    const codeInput = form.elements.code;
    const errorText = form.querySelector('.error');
    const submitButton = form.querySelector('button[type="submit"]');

    overlay.querySelector('[data-action="close"]').addEventListener('click', close);

    // Accepts "482 913" or pasted text, keeping only the digits.
    codeInput.addEventListener('input', () => {
      codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
    });

    function showError(message) {
      errorText.textContent = message;
      errorText.hidden = false;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = emailInput.value.trim();
      const code = codeInput.value;

      if (!/^\S+@\S+\.\S+$/.test(email)) {
        showError('Enter the email you use on the Rise app.');
        emailInput.focus();
        return;
      }

      if (!/^\d{6}$/.test(code)) {
        showError('Enter the 6-digit code from Settings → Canvas in the Rise app.');
        codeInput.focus();
        return;
      }

      errorText.hidden = true;
      submitButton.disabled = true;
      submitButton.textContent = 'Connecting…';

      try {
        await sendToRise({ type: 'pair', email, code, origin: location.origin });
        showClassPicker({
          isSetup: true,
          onSaved: () => {
            showConnected(email);
            onConnected();
          },
        });
      } catch (error) {
        showError(error.message);
        submitButton.disabled = false;
        submitButton.textContent = 'Connect →';
      }
    });
  }

  /** One class in the "Choose your classes" list, with its color palette. */
  function renderClassRow(course) {
    const row = document.createElement('div');
    row.className = 'class-row';
    row.innerHTML = `
      <label class="class-check">
        <input type="checkbox">
        <span class="checkmark" aria-hidden="true"></span>
        <span class="class-info">
          <span class="class-name"></span>
          <span class="class-meta"></span>
        </span>
      </label>
      <button class="color-button" type="button" aria-expanded="false"></button>
      <div class="palette" role="radiogroup" hidden></div>`;

    const checkbox = row.querySelector('input');
    const colorButton = row.querySelector('.color-button');
    const palette = row.querySelector('.palette');

    row.querySelector('.class-name').textContent = course.name;
    row.querySelector('.class-meta').textContent = [course.code, course.term].filter(Boolean).join(' · ');
    palette.setAttribute('aria-label', `Color for ${course.name}`);

    function showColor() {
      const { name, color } = COURSE_COLORS[course.color] ?? COURSE_COLORS.sage;
      row.style.setProperty('--class-color', color);
      colorButton.setAttribute('aria-label', `${name}. Change the color for ${course.name}`);

      palette.querySelectorAll('.swatch').forEach((swatch) => {
        swatch.setAttribute('aria-checked', String(swatch.dataset.color === course.color));
      });
    }

    for (const [key, { name, color }] of Object.entries(COURSE_COLORS)) {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'swatch';
      swatch.dataset.color = key;
      swatch.setAttribute('role', 'radio');
      swatch.setAttribute('aria-label', name);
      swatch.title = name;
      swatch.style.setProperty('--swatch', color);
      swatch.addEventListener('click', () => {
        course.color = key;
        showColor();
      });
      palette.append(swatch);
    }

    checkbox.checked = course.syncEnabled;
    row.classList.toggle('is-off', !course.syncEnabled);
    checkbox.addEventListener('change', () => {
      course.syncEnabled = checkbox.checked;
      row.classList.toggle('is-off', !checkbox.checked);
    });

    colorButton.addEventListener('click', () => {
      palette.hidden = !palette.hidden;
      colorButton.setAttribute('aria-expanded', String(!palette.hidden));
    });

    showColor();
    return row;
  }

  /**
   * "Choose your classes": which Canvas classes to sync and a color for each.
   * Shown right after connecting, and again from the toolbar popup.
   */
  async function showClassPicker({ isSetup = false, onSaved = close } = {}) {
    const overlay = render('classes', { isSetup });
    const list = overlay.querySelector('[data-slot="classes"]');
    const errorText = overlay.querySelector('.error');
    const saveButton = overlay.querySelector('[data-action="save"]');
    const saveLabel = saveButton.textContent.trim();

    overlay.querySelector('[data-action="close"]')?.addEventListener('click', close);

    function showError(message) {
      errorText.textContent = message;
      errorText.hidden = false;
    }

    let courses;

    try {
      courses = await sendToRise({ type: 'listCourses', origin: location.origin });
    } catch (error) {
      list.innerHTML = '';
      showError(error.message);
      return;
    }

    list.innerHTML = '';

    if (courses.length === 0) {
      list.innerHTML = '<p class="class-list-message">No current classes found in Canvas.</p>';
    }

    courses.forEach((course) => list.append(renderClassRow(course)));
    saveButton.disabled = false;

    saveButton.addEventListener('click', async () => {
      errorText.hidden = true;
      saveButton.disabled = true;
      saveButton.textContent = 'Saving…';

      try {
        await sendToRise({
          type: 'saveCourseChoices',
          choices: courses.map(({ canvasCourseId, color, syncEnabled }) => ({ canvasCourseId, color, syncEnabled })),
        });
        onSaved();
      } catch (error) {
        showError(error.message);
        saveButton.disabled = false;
        saveButton.textContent = saveLabel;
      }
    });
  }

  function showConnected(email) {
    const overlay = render('connected');
    overlay.querySelector('[data-slot="email"]').textContent = email;
    overlay.querySelector('[data-action="close"]').addEventListener('click', close);
  }

  function showSyllabusReviews({ reviews, onSave }) {
    const queue = [...reviews];
    let index = 0;

    function appendInput(parent, labelText, name, value = '', type = 'text') {
      const label = document.createElement('label');
      label.className = 'review-field review-field--compact';
      label.textContent = labelText;
      const input = document.createElement('input');
      input.name = name;
      input.type = type;
      input.value = value ?? '';
      if (name === 'title') input.maxLength = 50;
      if (type === 'time') input.step = '60';
      label.append(input);
      parent.append(label);
      return input;
    }

    function appendOfficeHour(parent, value = {}) {
      const row = document.createElement('div');
      row.className = 'review-row review-row--office';
      const dayLabel = document.createElement('label');
      dayLabel.className = 'review-field review-field--compact';
      dayLabel.textContent = 'Day';
      const day = document.createElement('select');
      day.name = 'dayOfWeek';
      [['', 'Select day'], ...[['Sunday', 0], ['Monday', 1], ['Tuesday', 2], ['Wednesday', 3], ['Thursday', 4], ['Friday', 5], ['Saturday', 6]].map(([label, value]) => [value, label])]
        .forEach(([key, text]) => {
          const option = document.createElement('option');
          option.value = key;
          option.textContent = text;
          day.append(option);
        });
      day.value = value.day_of_week ?? value.dayOfWeek ?? '';
      dayLabel.append(day);
      row.append(dayLabel);
      appendInput(row, 'Start', 'start', value.start, 'time');
      appendInput(row, 'End', 'end', value.end, 'time');

      const bookingLabel = document.createElement('label');
      bookingLabel.className = 'review-checkbox';
      const booking = document.createElement('input');
      booking.type = 'checkbox';
      booking.name = 'required_booking';
      booking.checked = Boolean(value.required_booking);
      bookingLabel.append(booking, document.createTextNode('Booking required'));
      row.append(bookingLabel);
      appendInput(row, 'Booking link (optional)', 'booking_link', value.booking_link ?? value.schedule_booking, 'url');

      const remove = document.createElement('button');
      remove.className = 'small-button small-button--remove';
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => row.remove());
      row.append(remove);
      parent.append(row);
    }

    function appendTopic(parent, value = {}) {
      const row = document.createElement('div');
      row.className = 'review-row review-row--topic';
      appendInput(row, 'Topic', 'title', value.title);
      const percentage = appendInput(row, 'Percent', 'percentage', value.percentage, 'number');
      percentage.min = '0';
      percentage.max = '100';
      percentage.step = '0.01';
      appendInput(row, 'Total count (optional)', 'total_count', value.total_count ?? '', 'number').min = '1';

      const remove = document.createElement('button');
      remove.className = 'small-button small-button--remove';
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => row.remove());
      row.append(remove);
      parent.append(row);
    }

    function renderReview() {
      if (index >= queue.length) {
        close();
        return;
      }

      const review = queue[index];
      const overlay = render('syllabusReview', { index, total: queue.length });
      const form = overlay.querySelector('form');
      const data = review.syllabusInfo ?? review;
      const topicData = data.topics ?? data.grading_scale?.topics ?? [];
      const courseName = review.courseName ?? review.name ?? 'Class';

      overlay.querySelector('[data-slot="progress"]').textContent = `Class ${index + 1} of ${queue.length}`;
      overlay.querySelector('[data-slot="course-name"]').textContent = courseName;
      overlay.querySelector('[data-slot="syllabus-note"]').textContent = review.hasSyllabus === false
        ? 'RISE could not find a syllabus for this class. Add the details you know below.'
        : 'Check the information found in the syllabus and correct anything that needs updating.';

      form.elements.gradingMode.value = data.grading_mode ?? 'points';
      form.elements.professorName.value = data.professorName ?? data.professor_name ?? '';
      form.elements.professorEmail.value = data.professorEmail ?? data.professor_email ?? '';
      form.elements.lateWork.value = data.late_work ?? data.lateWork ?? '';

      const officeHours = overlay.querySelector('[data-slot="office-hours"]');
      const topicsContainer = overlay.querySelector('[data-slot="topics"]');
      (data.office_hours?.length ? data.office_hours : [{}]).forEach((item) => appendOfficeHour(officeHours, item));
      topicData.forEach((item) => appendTopic(topicsContainer, item));

      overlay.querySelector('[data-action="add-office-hour"]').addEventListener('click', () => appendOfficeHour(officeHours));
      overlay.querySelector('[data-action="add-topic"]').addEventListener('click', () => appendTopic(topicsContainer));
      const errorText = form.querySelector('.error');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorText.hidden = true;
        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        button.textContent = 'Saving…';

        const valueByRow = (slot, build) => [...overlay.querySelectorAll(`[data-slot="${slot}"] .review-row`)]
          .map(build)
          .filter((item) => Object.values(item).some((value) => value !== '' && value !== false && value != null));
        const optionalText = (value) => value.trim() || null;

        const confirmed = {
          course_id: review.courseId ?? review.id,
          professor_name: optionalText(form.elements.professorName.value),
          professor_email: optionalText(form.elements.professorEmail.value),
          late_work: optionalText(form.elements.lateWork.value),
          grading_mode: form.elements.gradingMode.value,
          office_hours: valueByRow('office-hours', (row) => ({
            day_of_week: row.querySelector('[name="dayOfWeek"]').value === '' ? null : Number(row.querySelector('[name="dayOfWeek"]').value),
            start_time: optionalText(row.querySelector('[name="start"]').value),
            end_time: optionalText(row.querySelector('[name="end"]').value),
            required_booking: row.querySelector('[name="required_booking"]').checked,
            booking_link: optionalText(row.querySelector('[name="booking_link"]').value),
          })),
          topics: valueByRow('topics', (row) => ({
              title: row.querySelector('[name="title"]').value.trim(),
              percentage: row.querySelector('[name="percentage"]').value === ''
                ? null
                : Number(row.querySelector('[name="percentage"]').value),
              total_count: row.querySelector('[name="total_count"]').value === ''
                ? null
                : Number(row.querySelector('[name="total_count"]').value),
            })),
        };

        try {
          if (confirmed.office_hours.some((item) => item.day_of_week == null || !item.start_time || !item.end_time)) {
            throw new Error('For each office-hours entry, add a day, start time, and end time.');
          }
          if (confirmed.topics.some((item) => !item.title || item.percentage == null)) {
            throw new Error('For each grading topic, add a title and percentage.');
          }

          await onSave(confirmed);
          index += 1;
          renderReview();
        } catch (error) {
          errorText.textContent = error.message || 'Could not save this review. Please try again.';
          errorText.hidden = false;
          button.disabled = false;
          button.textContent = 'Confirm and continue';
        }
      });
    }

    if (queue.length) renderReview();
  }

  /** Updates the status box on the "You're connected" screen, if it's open. */
  function showSyncResult({ message, isError = false }) {
    const status = shadow?.querySelector('[data-slot="status"]');

    if (status) {
      status.textContent = message;
      status.classList.toggle('info-box--error', isError);
    }
  }

  /** A small corner message for syncs that happen in the background. */
  function showToast(message) {
    ensureHost();

    shadow.querySelector('.toast')?.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `<img src="${asset('images/rise-logo.svg')}" alt=""><span></span>`;
    toast.querySelector('span').textContent = message;
    shadow.append(toast);

    setTimeout(() => toast.remove(), 4000);
  }

  return { showNote, showWelcome, showClassPicker, showSyllabusReviews, showSyncResult, showToast };
})();
