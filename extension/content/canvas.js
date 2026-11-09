// Runs on Canvas pages. Before the extension is connected it shows the Rise
// pop-ups. After that, syncing happens in the background service worker on a
// timer; opening Canvas just nudges it to sync if it hasn't recently.

/* global RiseCanvasApi, RiseModal, RiseSyllabusEvidence, sendToRise */
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

  function openSyllabusEntry(course) {
    if (!course?.courseId || !course?.canvasCourseId) return;
    RiseModal.showSyllabusMethod({
      courses: [course],
      onSelected: () => syncNow({ announce: true, force: true }),
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

    if (requested === 'syllabus-entry') {
      const { pendingSyllabusEntry } = await chrome.storage.local.get('pendingSyllabusEntry');
      if (pendingSyllabusEntry) {
        await chrome.storage.local.remove('pendingSyllabusEntry');
        openSyllabusEntry(pendingSyllabusEntry);
      }
    } else if (requested === 'classes') {
      openClassPicker();
    } else {
      syncNow({ announce: requested === 'sync', force: requested === 'sync' });
    }
  }

  // Requests from the toolbar popup.
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'highlightSyllabusEvidence') {
      sendResponse({ ok: true, result: { highlighted: RiseSyllabusEvidence.highlight(message.quote) } });
      return;
    } else if (message?.type === 'captureSyllabusPage') {
      const match = location.pathname.match(/\/courses\/(\d+)/);
      const text = document.body?.innerText?.trim() ?? '';
      const pageLinks = [...document.querySelectorAll('a[href]')]
        .map((link) => {
          const url = link.href;
          if (!/^https:\/\//i.test(url)) return null;
          const contextNode = link.closest('p, li, td, dd, blockquote') || link.parentElement;
          const nearbyText = [
            link.closest('tr')?.innerText,
            contextNode?.previousElementSibling?.innerText,
            contextNode?.innerText,
            contextNode?.nextElementSibling?.innerText,
          ].filter(Boolean).join(' ');
          return {
            label: (link.innerText || link.textContent || '').trim().slice(0, 240),
            url: url.slice(0, 2000),
            nearbyText: (nearbyText || link.innerText || '').trim().slice(0, 1200),
          };
        })
        .filter(Boolean)
        .filter((link, index, all) => all.findIndex((item) => item.url === link.url) === index)
        .slice(0, 100);
      const attachments = [...document.querySelectorAll('a[href]')]
        .map((link) => {
          const href = link.href;
          const apiEndpoint = link.getAttribute('data-api-endpoint');
          const fileMatch = `${apiEndpoint || ''} ${href}`.match(/\/files\/(\d+)/);
          const title = link.getAttribute('download') || link.textContent.trim() || link.title || href.split('/').pop();
          const fileLike = fileMatch || /\.(pdf|docx|txt)(?:[?#]|$)/i.test(href) || /\.(pdf|docx|txt)$/i.test(title);
          if (!fileLike || !/^https:\/\//i.test(href)) return null;
          return { title: title.slice(0, 240), url: href, apiEndpoint, fileId: fileMatch?.[1] ?? null };
        })
        .filter(Boolean)
        .filter((item, index, all) => all.findIndex((candidate) => candidate.url === item.url) === index)
        .sort((a, b) => Number(/syllabus/i.test(b.title)) - Number(/syllabus/i.test(a.title)))
        .slice(0, 20);
      const currentFile = location.pathname.match(/\/courses\/(\d+)\/files\/(\d+)/);
      if (currentFile && match?.[1] === currentFile[1] && !attachments.some((item) => item.fileId === currentFile[2])) {
        attachments.unshift({
          title: document.title || 'Canvas syllabus document',
          url: location.href,
          apiEndpoint: null,
          fileId: currentFile[2],
        });
      }
      sendResponse({
        ok: true,
        result: {
          url: location.href,
          title: document.title,
          courseCanvasId: match?.[1] ?? null,
          text: text.slice(0, 80000),
          pageLinks,
          attachments,
        },
      });
      return;
    } else if (message?.type === 'syncNow') {
      syncNow({ announce: true, force: true });
    } else if (message?.type === 'openClasses') {
      openClassPicker();
    } else if (message?.type === 'openSyllabusEntry') {
      openSyllabusEntry(message.course);
    } else if (message?.type === 'openConnect') {
      chrome.storage.local.get('noteSeen').then(({ noteSeen }) => openConnectFlow({ includeNote: !noteSeen }));
    } else {
      return;
    }

    sendResponse({ ok: true });
  });

  start();
})();
