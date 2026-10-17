// Runs on Canvas pages. Before the extension is connected it shows the Rise
// pop-ups; after that it syncs Canvas into Rise in the background.

/* global RiseCanvasApi, RiseModal, sendToRise */
(() => {
  // How often visiting Canvas triggers a background sync.
  const AUTO_SYNC_INTERVAL_MS = 30 * 60 * 1000;

  let isSyncing = false;

  function plural(count, word) {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
  }

  /**
   * Reads Canvas and sends it to Rise. `announce` shows the result in the
   * corner; the "You're connected" screen shows it there instead.
   */
  async function syncNow({ announce }) {
    if (isSyncing) {
      return;
    }

    isSyncing = true;

    try {
      const payload = await RiseCanvasApi.collect();
      const result = await sendToRise({ type: 'sync', payload });
      const message = `Synced ${plural(result.courses, 'course')} and ${plural(result.assignments, 'assignment')} to Rise.`;

      RiseModal.showSyncResult({ message: `✅ ${message}` });

      if (announce) {
        RiseModal.showToast(message);
      }
    } catch (error) {
      RiseModal.showSyncResult({ message: error.message, isError: true });

      if (announce) {
        RiseModal.showToast(`Rise couldn't sync: ${error.message}`);
      }
    } finally {
      isSyncing = false;
    }
  }

  function openConnectFlow({ includeNote }) {
    const options = {
      onSeen: () => chrome.storage.local.set({ noteSeen: true }),
      onConnected: () => syncNow({ announce: false }),
    };

    if (includeNote) {
      RiseModal.showNote(options);
    } else {
      RiseModal.showWelcome(options);
    }
  }

  async function start() {
    // Links from the welcome page and popup add ?rise=open or ?rise=sync.
    const requested = new URLSearchParams(location.search).get('rise');
    const { token, noteSeen, lastSync } = await chrome.storage.local.get(['token', 'noteSeen', 'lastSync']);

    if (!token) {
      // Show the pop-ups automatically once; after that only when asked.
      if (requested || !noteSeen) {
        openConnectFlow({ includeNote: !noteSeen });
      }
      return;
    }

    const isDue = !lastSync || Date.now() - Date.parse(lastSync.at) > AUTO_SYNC_INTERVAL_MS;

    if (requested === 'sync' || isDue) {
      syncNow({ announce: true });
    }
  }

  // Requests from the toolbar popup.
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'syncNow') {
      syncNow({ announce: true });
      sendResponse({ ok: true });
    } else if (message?.type === 'openConnect') {
      chrome.storage.local.get('noteSeen').then(({ noteSeen }) => openConnectFlow({ includeNote: !noteSeen }));
      sendResponse({ ok: true });
    }
  });

  start();
})();
