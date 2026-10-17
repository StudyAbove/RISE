// Service worker: opens the welcome page on install, keeps Canvas synced in
// the background, and talks to the Rise backend (the canvas-extension Edge
// Function) for the Canvas pages and popup.

importScripts('config.js', 'content/canvasApi.js');

const FUNCTION_PATH = '/functions/v1/canvas-extension';
const AUTO_SYNC_ALARM = 'rise-auto-sync';

// How often Rise checks Canvas on its own, and how recent a sync must be for
// opening Canvas not to start another one.
const AUTO_SYNC_MINUTES = 30;
const SYNC_FRESH_MS = 10 * 60 * 1000;

let syncInProgress = null;

/** Calls the canvas-extension function and throws its error message on failure. */
async function callRise(body, token) {
  const headers = { 'Content-Type': 'application/json' };

  if (token) {
    headers['x-rise-extension-token'] = token;
  }

  let response;

  try {
    response = await fetch(self.RISE_CONFIG.supabaseUrl + FUNCTION_PATH, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Rise couldn't be reached. Check your internet connection.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'Something went wrong. Please try again.');
    error.code = data.code;

    // The token was revoked (e.g. disconnected), so the student must pair again.
    if (error.code === 'reconnect_required') {
      await chrome.storage.local.remove(['token', 'lastSync']);
    }

    throw error;
  }

  return data;
}

async function getToken() {
  const { token } = await chrome.storage.local.get('token');

  if (!token) {
    const error = new Error('Connect the extension to Rise first.');
    error.code = 'reconnect_required';
    throw error;
  }

  return token;
}

/** Sends collected Canvas data to Rise and remembers the result for the popup. */
async function sendSync(payload) {
  try {
    const result = await callRise({ action: 'sync', ...payload }, await getToken());

    await chrome.storage.local.set({
      lastSync: { at: result.syncedAt, courses: result.courses, assignments: result.assignments },
      lastSyncError: null,
    });

    return result;
  } catch (error) {
    // Canvas being signed out isn't a Rise problem; the next visit fixes it.
    if (error.code !== 'canvas_signed_out') {
      await chrome.storage.local.set({ lastSyncError: error.message });
    }

    throw error;
  }
}

/**
 * Reads Canvas from here and syncs it. Only one sync runs at a time; extra
 * requests wait for the one in progress.
 */
function syncFromCanvas(origin) {
  syncInProgress ??= (async () => {
    try {
      await chrome.storage.local.set({ canvasOrigin: origin });
      return await sendSync(await RiseCanvasApi.collect(origin));
    } finally {
      syncInProgress = null;
    }
  })();

  return syncInProgress;
}

/** Background sync when the student is connected and hasn't synced recently. */
async function autoSync() {
  const { token, canvasOrigin, lastSync } = await chrome.storage.local.get(['token', 'canvasOrigin', 'lastSync']);
  const isFresh = lastSync && Date.now() - Date.parse(lastSync.at) < SYNC_FRESH_MS;

  if (token && canvasOrigin && !isFresh) {
    // Errors are saved for the popup; a signed-out Canvas just waits for the
    // next time the student opens Canvas.
    await syncFromCanvas(canvasOrigin).catch(() => {});
  }
}

function scheduleAutoSync() {
  chrome.alarms.create(AUTO_SYNC_ALARM, { periodInMinutes: AUTO_SYNC_MINUTES });
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  scheduleAutoSync();

  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome/welcome.html') });
  }
});

chrome.runtime.onStartup.addListener(() => {
  scheduleAutoSync();
  autoSync();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_SYNC_ALARM) {
    autoSync();
  }
});

const messageHandlers = {
  /** Connects the extension to the student's Rise account. */
  async pair({ email, code, origin }) {
    const { token } = await callRise({ action: 'pair', email, code });

    await chrome.storage.local.set({
      token,
      email: email.trim().toLowerCase(),
      canvasOrigin: origin,
      lastSyncError: null,
    });

    return { connected: true };
  },

  /** The student's Canvas classes, with the colors and choices saved in Rise. */
  async listCourses({ origin }) {
    const courses = await RiseCanvasApi.collectCourses(origin);
    const { courses: saved } = await callRise(
      { action: 'courses', canvasDomain: new URL(origin).hostname, courses },
      await getToken(),
    );

    return saved;
  },

  async saveCourseChoices({ choices }) {
    return callRise({ action: 'saveCourseChoices', choices }, await getToken());
  },

  /** Opening Canvas or pressing Sync now. Skips if a sync just ran, unless forced. */
  async syncNow({ origin, force }) {
    const { lastSync } = await chrome.storage.local.get('lastSync');

    if (!force && lastSync && Date.now() - Date.parse(lastSync.at) < SYNC_FRESH_MS) {
      return { skipped: true };
    }

    return syncFromCanvas(origin);
  },

  /** Data a Canvas page collected itself, when this worker couldn't read Canvas. */
  async sync({ payload }) {
    return sendSync(payload);
  },

  async disconnect() {
    const { token } = await chrome.storage.local.get('token');

    if (token) {
      // Forget the token locally even if Rise can't be reached right now.
      await callRise({ action: 'disconnect' }, token).catch(() => {});
    }

    await chrome.storage.local.remove(['token', 'email', 'lastSync', 'lastSyncError']);
    return { disconnected: true };
  },
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = messageHandlers[message?.type];

  if (!handler) {
    return false;
  }

  handler(message).then(
    (result) => sendResponse({ ok: true, result }),
    (error) => sendResponse({ ok: false, error: error.message, code: error.code }),
  );

  // Keeps the message channel open for the async response.
  return true;
});
