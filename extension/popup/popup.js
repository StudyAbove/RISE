// Toolbar popup: shows whether the extension is connected and lets the
// student sync now, change their classes and colors, or disconnect.

const CANVAS_TABS = { url: 'https://*.instructure.com/*' };

const disconnectedSection = document.getElementById('disconnected');
const connectedSection = document.getElementById('connected');
const syncStatus = document.getElementById('sync-status');
const syncNowButton = document.getElementById('sync-now');
const missingSyllabi = document.getElementById('missing-syllabi');

function plural(count, word, pluralWord = `${word}s`) {
  return `${count} ${count === 1 ? word : pluralWord}`;
}

function formatLastSynced(isoDate) {
  const minutes = Math.floor((Date.now() - Date.parse(isoDate)) / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} hr ago`;

  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function render() {
  const { token, email, lastSync, lastSyncError } = await chrome.storage.local.get([
    'token',
    'email',
    'lastSync',
    'lastSyncError',
  ]);

  disconnectedSection.hidden = Boolean(token);
  connectedSection.hidden = !token;

  if (!token) {
    return;
  }

  document.getElementById('email').textContent = email;
  syncStatus.classList.toggle('is-error', Boolean(lastSyncError));

  if (lastSyncError) {
    syncStatus.textContent = `Last sync failed: ${lastSyncError}`;
  } else if (lastSync) {
    syncStatus.textContent = `✅ Synced ${formatLastSynced(lastSync.at)} · ${plural(lastSync.courses, 'class', 'classes')} · ${plural(lastSync.assignments, 'assignment')}`;
  } else {
    syncStatus.textContent = '📚 Rise syncs Canvas every 30 minutes and whenever you open it.';
  }

  await renderMissingSyllabi();
}

async function renderMissingSyllabi() {
  missingSyllabi.replaceChildren();
  const loading = document.createElement('p');
  loading.className = 'missing-syllabi__empty';
  loading.textContent = 'Checking selected classes for missing syllabi…';
  missingSyllabi.append(loading);

  try {
    const response = await chrome.runtime.sendMessage({ type: 'listMissingSyllabusCourses' });
    if (!response?.ok) throw new Error(response?.error || 'Could not check for missing syllabi.');
    const courses = response.result?.courses ?? [];
    missingSyllabi.replaceChildren();
    if (!courses.length) {
      const empty = document.createElement('p');
      empty.className = 'missing-syllabi__empty';
      empty.textContent = 'No selected classes are missing a syllabus.';
      missingSyllabi.append(empty);
      return;
    }

    const title = document.createElement('p');
    title.className = 'missing-syllabi__title';
    title.textContent = 'Classes without a saved syllabus';
    const list = document.createElement('div');
    list.className = 'missing-syllabi__list';
    for (const course of courses) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'missing-syllabus-button';
      const warning = document.createElement('span');
      warning.className = 'missing-syllabus-warning';
      warning.textContent = '⚠ Warning';
      const name = document.createElement('span');
      name.className = 'missing-syllabus-name';
      name.textContent = course.name || course.code || 'Class';
      button.append(warning, name);
      button.addEventListener('click', () => openSyllabusEntry(course, button));
      list.append(button);
    }
    missingSyllabi.append(title, list);
  } catch (error) {
    missingSyllabi.replaceChildren();
    const message = document.createElement('p');
    message.className = 'missing-syllabi__error';
    message.textContent = error.message;
    missingSyllabi.append(message);
  }
}

async function openSyllabusEntry(course, button) {
  button.disabled = true;
  button.querySelector('.missing-syllabus-name').textContent = 'Opening…';
  try {
    const { canvasOrigin } = await chrome.storage.local.get('canvasOrigin');
    const tabQuery = canvasOrigin ? { url: `${canvasOrigin}/*` } : CANVAS_TABS;
    const [canvasTab] = await chrome.tabs.query(tabQuery);
    if (canvasTab?.id) {
      try {
        const response = await chrome.tabs.sendMessage(canvasTab.id, { type: 'openSyllabusEntry', course });
        if (!response?.ok) throw new Error('Canvas tab did not respond.');
        await chrome.tabs.update(canvasTab.id, { active: true });
        window.close();
        return;
      } catch {
        // Reopen the course page so the extension content script can start the flow.
      }
    }

    await chrome.storage.local.set({ pendingSyllabusEntry: course });
    const courseUrl = new URL(`/courses/${encodeURIComponent(course.canvasCourseId)}`, canvasOrigin || self.RISE_CONFIG.canvasUrl);
    courseUrl.searchParams.set('rise', 'syllabus-entry');
    if (canvasTab?.id) await chrome.tabs.update(canvasTab.id, { url: courseUrl.href, active: true });
    else await chrome.tabs.create({ url: courseUrl.href });
    window.close();
  } catch (error) {
    button.disabled = false;
    button.querySelector('.missing-syllabus-name').textContent = course.name || course.code || 'Class';
    console.error('Could not open syllabus entry:', error);
  }
}

/** Uses an open Canvas tab if there is one, otherwise opens Canvas. */
async function sendToCanvasTab(messageType, fallbackQuery) {
  const [canvasTab] = await chrome.tabs.query(CANVAS_TABS);

  if (canvasTab) {
    try {
      await chrome.tabs.sendMessage(canvasTab.id, { type: messageType });
      await chrome.tabs.update(canvasTab.id, { active: true });
    } catch {
      // An already-open Canvas tab may predate an extension reload and have no
      // content script. Reload it through the URL flow so the script runs.
      const canvasUrl = new URL(canvasTab.url);
      canvasUrl.searchParams.set('rise', fallbackQuery);
      await chrome.tabs.update(canvasTab.id, { url: canvasUrl.toString(), active: true });
    }
  } else {
    await chrome.tabs.create({ url: `${self.RISE_CONFIG.canvasUrl}/?rise=${fallbackQuery}` });
  }
}

document.getElementById('connect').addEventListener('click', async () => {
  await sendToCanvasTab('openConnect', 'open');
  window.close();
});

// The background syncs on its own; this just runs it right away.
syncNowButton.addEventListener('click', async () => {
  syncNowButton.disabled = true;
  syncNowButton.textContent = 'Syncing…';

  const { canvasOrigin } = await chrome.storage.local.get('canvasOrigin');
  const response = await chrome.runtime.sendMessage({
    type: 'syncNow',
    origin: canvasOrigin || self.RISE_CONFIG.canvasUrl,
    force: true,
  });

  // Canvas needs signing in again; opening it lets the page sync instead.
  if (response?.code === 'canvas_signed_out') {
    await sendToCanvasTab('syncNow', 'sync');
  }

  syncNowButton.disabled = false;
  syncNowButton.textContent = 'Sync now';
  render();
});

document.getElementById('classes').addEventListener('click', async () => {
  await sendToCanvasTab('openClasses', 'classes');
  window.close();
});

document.getElementById('disconnect').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'disconnect' });
  render();
});

// Updates while open, e.g. when a background sync finishes.
chrome.storage.onChanged.addListener(render);

render();
