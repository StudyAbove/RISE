// Runs on Canvas pages. Before the extension is connected it shows the Rise
// pop-ups. After that, syncing happens in the background service worker on a
// timer; opening Canvas just nudges it to sync if it hasn't recently.

/* global RiseCanvasApi, RiseModal, sendToRise */
(() => {
  function plural(count, word, pluralWord = `${word}s`) {
    return `${count} ${count === 1 ? word : pluralWord}`;
  }

  /** Asks the background to sync, or reads Canvas here if it can't. */
  async function requestSync({ force }) {
    try {
      return await sendToRise({ type: 'syncNow', origin: location.origin, force });
    } catch (error) {
      if (error.code !== 'canvas_signed_out') {
        throw error;
      }

      // The page has the Canvas session even when the background doesn't.
      return sendToRise({ type: 'sync', payload: await RiseCanvasApi.collect(location.origin) });
    }
  }

  /**
   * `announce` shows the result in the corner; right after connecting, the
   * "You're connected" screen shows it instead.
   */
  async function syncNow({ announce, force = false }) {
    try {
      const result = await requestSync({ force });

      if (result.skipped) {
        return;
      }

      const message = `Synced ${plural(result.courses, 'class', 'classes')} and ${plural(result.assignments, 'assignment')} to Rise.`;
      RiseModal.showSyncResult({ message: `✅ ${message}` });

      if (announce) {
        RiseModal.showToast(message);
      }
    } catch (error) {
      RiseModal.showSyncResult({ message: error.message, isError: true });

      if (announce) {
        RiseModal.showToast(`Rise couldn't sync: ${error.message}`);
      }
    }
  }

  function openConnectFlow({ includeNote }) {
    const options = {
      onSeen: () => chrome.storage.local.set({ noteSeen: true }),
      onConnected: () => syncNow({ announce: false, force: true }),
    };

    if (includeNote) {
      RiseModal.showNote(options);
    } else {
      RiseModal.showWelcome(options);
    }
  }

  /** Changing classes or colors later; syncs right away so the changes show. */
  function openClassPicker() {
    RiseModal.showClassPicker({
      onSaved: () => {
        RiseModal.showToast('Saved your classes. Syncing…');
        syncNow({ announce: true, force: true });
      },
    });
  }

  async function start() {
    // Links from the welcome page and popup add ?rise=open, ?rise=sync or ?rise=classes.
    const requested = new URLSearchParams(location.search).get('rise');
    const { token, noteSeen } = await chrome.storage.local.get(['token', 'noteSeen']);

    if (!token) {
      // Show the pop-ups automatically once; after that only when asked.
      if (requested || !noteSeen) {
        openConnectFlow({ includeNote: !noteSeen });
      }
      return;
    }

    if (requested === 'classes') {
      openClassPicker();
    } else {
      syncNow({ announce: requested === 'sync', force: requested === 'sync' });
    }
  }

  // Requests from the toolbar popup.
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'syncNow') {
      syncNow({ announce: true, force: true });
    } else if (message?.type === 'openClasses') {
      openClassPicker();
    } else if (message?.type === 'openConnect') {
      chrome.storage.local.get('noteSeen').then(({ noteSeen }) => openConnectFlow({ includeNote: !noteSeen }));
    } else {
      return;
    }

    sendResponse({ ok: true });
  });

  start();
})();
