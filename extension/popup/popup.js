// Toolbar popup: shows whether the extension is connected and lets the
// student sync now or disconnect.

const CANVAS_TABS = { url: 'https://*.instructure.com/*' };

const disconnectedSection = document.getElementById('disconnected');
const connectedSection = document.getElementById('connected');
const syncStatus = document.getElementById('sync-status');
const syncNowButton = document.getElementById('sync-now');

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
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
    syncStatus.textContent = `✅ Synced ${formatLastSynced(lastSync.at)} · ${plural(lastSync.courses, 'course')} · ${plural(lastSync.assignments, 'assignment')}`;
  } else {
    syncStatus.textContent = '📚 Open Canvas to run your first sync.';
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

syncNowButton.addEventListener('click', async () => {
  syncNowButton.disabled = true;
  syncNowButton.textContent = 'Syncing…';
  await sendToCanvasTab('syncNow', 'sync');
});

document.getElementById('disconnect').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'disconnect' });
  render();
});

// Updates while open, e.g. when a sync started from here finishes.
chrome.storage.onChanged.addListener(() => {
  syncNowButton.disabled = false;
  syncNowButton.textContent = 'Sync now';
  render();
});

render();
