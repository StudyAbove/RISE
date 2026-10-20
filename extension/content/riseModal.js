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
        <div class="brand"><img src="${asset('images/rise-logo.png')}" alt="">Rise</div>
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

        <div class="brand"><img src="${asset('images/rise-logo.png')}" alt="">Rise</div>
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

        <div class="brand brand--start"><img src="${asset('images/rise-logo.png')}" alt="">Rise</div>
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

        <div class="brand brand--start"><img src="${asset('images/rise-logo.png')}" alt="">Rise</div>
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
        <div class="tile"><img src="${asset('images/rise-logo.png')}" alt=""></div>
        <h2 class="title title--large" id="rise-title">You're connected!</h2>
        <p class="lead">Rise is syncing Canvas for</p>
        <p class="email" data-slot="email"></p>
        <p class="info-box" data-slot="status" role="status">📚 Importing your courses and assignments…</p>
        <button class="link-button" type="button" data-action="close">Done</button>
      </div>`,
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
    toast.innerHTML = `<img src="${asset('images/rise-logo.png')}" alt=""><span></span>`;
    toast.querySelector('span').textContent = message;
    shadow.append(toast);

    setTimeout(() => toast.remove(), 4000);
  }

  return { showNote, showWelcome, showClassPicker, showSyncResult, showToast };
})();
