// Service worker: opens the welcome page on install and talks to the Rise
// backend (the canvas-extension Edge Function) for the Canvas pages and popup.

importScripts('config.js');

const FUNCTION_PATH = '/functions/v1/canvas-extension';

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome/welcome.html') });
  }
});

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
    throw error;
  }

  return data;
}

const messageHandlers = {
  /** Connects the extension to the student's Rise account. */
  async pair({ email, code }) {
    const { token } = await callRise({ action: 'pair', email, code });
    await chrome.storage.local.set({ token, email: email.trim().toLowerCase(), lastSyncError: null });
    return { connected: true };
  },

  /** Sends the Canvas data a Canvas tab collected. */
  async sync({ payload }) {
    const { token } = await chrome.storage.local.get('token');

    if (!token) {
      const error = new Error('Connect the extension to Rise first.');
      error.code = 'reconnect_required';
      throw error;
    }

    try {
      const result = await callRise({ action: 'sync', ...payload }, token);

      await chrome.storage.local.set({
        lastSync: { at: result.syncedAt, courses: result.courses, assignments: result.assignments },
        lastSyncError: null,
      });

      return result;
    } catch (error) {
      // The token was revoked (e.g. disconnected), so the student must pair again.
      if (error.code === 'reconnect_required') {
        await chrome.storage.local.remove(['token', 'lastSync']);
      }

      await chrome.storage.local.set({ lastSyncError: error.message });
      throw error;
    }
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
