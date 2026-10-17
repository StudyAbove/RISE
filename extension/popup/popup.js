// Toolbar popup: shows whether the extension is connected and lets the
// student sync now, change their classes and colors, or disconnect.

const CANVAS_TABS = { url: 'https://*.instructure.com/*' };

const disconnectedSection = document.getElementById('disconnected');
const connectedSection = document.getElementById('connected');
const syncStatus = document.getElementById('sync-status');
const syncNowButton = document.getElementById('sync-now');

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
}

/** Uses an open Canvas tab if there is one, otherwise opens Canvas. */
async function sendToCanvasTab(messageType, fallbackQuery) {
  const [canvasTab] = await chrome.tabs.query(CANVAS_TABS);

  if (canvasTab) {
    await chrome.tabs.sendMessage(canvasTab.id, { type: messageType }).catch(() => {});
    await chrome.tabs.update(canvasTab.id, { active: true });
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
