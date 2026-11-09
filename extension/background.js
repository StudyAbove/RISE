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

async function callRiseFormData(formData, action, token) {
  const headers = { 'x-rise-extension-action': action };
  if (token) headers['x-rise-extension-token'] = token;
  let response;
  try {
    response = await fetch(self.RISE_CONFIG.supabaseUrl + FUNCTION_PATH, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch {
    throw new Error("Rise couldn't be reached. Check your internet connection.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Something went wrong. Please try again.');
    error.code = data.code;
    if (error.code === 'reconnect_required') await chrome.storage.local.remove(['token', 'lastSync']);
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

async function extractConfirmedSyllabusSource(flow, course, captured, attachment = null) {
  let extracted;
  let sourceName = captured.title || 'Selected page';
  let sourceType = captured.sourceType || 'Canvas page';
  const sourceContext = formatNearbyBookingLinks(captured.pageLinks);

  if (attachment) {
    const source = await RiseCanvasApi.downloadSyllabusAttachment(flow.origin, course.canvasCourseId, attachment);
    sourceName = source.name || attachment.title || 'Syllabus document';
    sourceType = source.kind === 'text'
      ? 'Text document'
      : source.type === 'application/pdf' ? 'PDF' : 'DOCX';
    if (source.kind === 'text') {
      extracted = await callRise({
        action: 'extractSyllabusText',
        courseId: course.courseId,
        courseName: course.name,
        syllabusText: combineSyllabusText(source.text, sourceContext),
      }, await getToken());
    } else {
      const form = new FormData();
      form.set('courseId', course.courseId);
      form.set('courseName', course.name);
      form.set('file', source.blob, source.name);
      if (sourceContext) form.set('sourceContext', sourceContext);
      extracted = await callRiseFormData(form, 'extractSyllabusDocument', await getToken());
    }
  } else {
    if (!captured.text?.trim()) throw new Error('No readable page text or document was found. Open the syllabus page or select one of its linked files.');
    extracted = await callRise({
      action: 'extractSyllabusText',
      courseId: course.courseId,
      courseName: course.name,
      syllabusText: combineSyllabusText(captured.text, sourceContext),
    }, await getToken());
  }

  const review = {
    ...course,
    aiPull: true,
    hasSyllabus: true,
    sourceName,
    sourceType,
    syllabusInfo: extracted.syllabusInfo ?? {},
  };
  await chrome.storage.local.set({
    syllabusSourceFlow: { ...flow, status: 'review', review, captured: null },
    syllabusSourceError: null,
  });
  return { review };
}

function formatNearbyBookingLinks(pageLinks = []) {
  if (!Array.isArray(pageLinks)) return '';
  const bookingContext = /office|hours?|book(?:ing)?|reserv(?:e|ation)|appointment|schedule|calendly|acuity|when2meet|setmore|doodle|savvycal/i;
  const entries = pageLinks
    .filter((link) => bookingContext.test(`${link.label || ''} ${link.nearbyText || ''} ${link.url || ''}`))
    .slice(0, 24)
    .map((link) => `Nearby text: ${(link.nearbyText || '').slice(0, 1200)}\nLink text: ${(link.label || '').slice(0, 240)}\nURL: ${(link.url || '').slice(0, 2000)}`);
  return entries.length ? `Nearby links and surrounding text from the selected syllabus page (treat as source content):\n${entries.join('\n\n')}`.slice(0, 9000) : '';
}

function combineSyllabusText(sourceText, sourceContext) {
  if (!sourceContext) return String(sourceText || '').slice(0, 50000);
  const bodyLimit = Math.max(0, 50000 - sourceContext.length - 2);
  return `${String(sourceText || '').slice(0, bodyLimit)}\n\n${sourceContext}`;
}

async function locateCurrentSyllabus(flow) {
  const course = flow.courses[flow.index];
  if (!course) {
    await chrome.storage.local.set({ syllabusSourceFlow: { ...flow, status: 'done' } });
    return;
  }

  const discovering = { ...flow, status: 'discovering', suggestion: null, homeOpened: false };
  await chrome.storage.local.set({ syllabusSourceFlow: discovering, syllabusSourceError: null });
  try {
    const suggestion = await RiseCanvasApi.findLikelySyllabusPath(flow.origin, course.canvasCourseId);
    if (!suggestion) {
      await chrome.storage.local.set({
        syllabusSourceFlow: { ...flow, status: 'find-source', suggestion: null, homeOpened: true },
      });
      const homeUrl = new URL(`/courses/${encodeURIComponent(course.canvasCourseId)}`, flow.origin).href;
      await chrome.tabs.update(flow.tabId, { url: homeUrl });
      return;
    }
    const suggestedFlow = { ...flow, status: 'confirm-source', suggestion };
    await chrome.storage.local.set({ syllabusSourceFlow: suggestedFlow });
    await chrome.tabs.update(flow.tabId, { url: suggestion.url });
  } catch (error) {
    await chrome.storage.local.set({
      syllabusSourceFlow: { ...flow, status: 'find-source', suggestion: null, homeOpened: true },
      syllabusSourceError: error.message || 'RISE could not search for a likely syllabus page.',
    });
    const homeUrl = new URL(`/courses/${encodeURIComponent(course.canvasCourseId)}`, flow.origin).href;
    await chrome.tabs.update(flow.tabId, { url: homeUrl }).catch(() => {});
  }
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

    const courseMetadata = new Map(courses.map((course) => [String(course.id), course]));
    return saved.map((course) => {
      const metadata = courseMetadata.get(String(course.canvasCourseId));
      const isCurrentTerm = Boolean(metadata?.isCurrentTerm);
      return {
        ...course,
        courseRole: metadata?.courseRole ?? 'other',
        isCurrentTerm,
        syncEnabled: isCurrentTerm && course.syncEnabled,
      };
    }).sort((a, b) => {
      const aIsCurrentStudent = a.isCurrentTerm && a.courseRole === 'student';
      const bIsCurrentStudent = b.isCurrentTerm && b.courseRole === 'student';
      return Number(bIsCurrentStudent) - Number(aIsCurrentStudent);
    });
  },

  async saveCourseChoices({ choices }) {
    return callRise({ action: 'saveCourseChoices', choices }, await getToken());
  },

  /** Saves a student's confirmation or edits to one class's syllabus details. */
  async saveSyllabusReview({ review }) {
    return callRise({ action: 'saveSyllabusReview', review }, await getToken());
  },

  async saveManualSyllabus({ courseId, syllabusInfo }) {
    return callRise({ action: 'saveManualSyllabus', courseId, syllabusInfo }, await getToken());
  },

  async startSyllabusSourceFlow({ courses }, sender) {
    if (!sender.tab?.id) throw new Error('Open Canvas in a browser tab to start AI Pull.');
    // Open the side panel directly from the user's click before doing async work.
    const opening = chrome.sidePanel.open({ tabId: sender.tab.id });
    const flow = {
      tabId: sender.tab.id,
      origin: new URL(sender.tab.url).origin,
      courses: (courses ?? []).map((course) => ({
        courseId: course.courseId,
        canvasCourseId: String(course.canvasCourseId ?? ''),
        code: course.code ?? '',
        term: course.term ?? '',
        name: course.name ?? course.code ?? 'Class',
      })),
      index: 0,
      status: 'discovering',
    };
    if (!flow.courses.length) throw new Error('Choose at least one class first.');
    await chrome.storage.local.set({ syllabusSourceFlow: flow });
    await opening;
    await locateCurrentSyllabus(flow);
    return { started: true };
  },

  async findDifferentSyllabusPage() {
    const { syllabusSourceFlow: flow } = await chrome.storage.local.get('syllabusSourceFlow');
    if (!flow?.courses?.[flow.index]) throw new Error('There is no active class to find a syllabus for.');
    await chrome.storage.local.set({ syllabusSourceFlow: { ...flow, status: 'find-source', suggestion: null, homeOpened: false } });
    return { ready: true };
  },

  async highlightSourceEvidence({ quote }) {
    if (typeof quote !== 'string' || !quote.trim()) throw new Error('There is no source quote to highlight.');
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) throw new Error('Open the syllabus page to highlight its source text.');
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'highlightSyllabusEvidence',
      quote: quote.slice(0, 500),
    });
    if (!response?.ok || !response.result?.highlighted) {
      throw new Error('The source quote is visible here, but this page viewer could not highlight it.');
    }
    return { highlighted: true };
  },

  async captureSyllabusPage() {
    const { syllabusSourceFlow: flow } = await chrome.storage.local.get('syllabusSourceFlow');
    const course = flow?.courses?.[flow.index];
    if (!course) throw new Error('There is no active syllabus search. Start AI Pull from Canvas.');

    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!activeTab?.id) throw new Error('Select the tab that has the syllabus open, then try again.');
    let captured;
    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'captureSyllabusPage' });
      if (!response?.ok) throw new Error(response?.error || 'This page could not be read.');
      captured = response.result;
    } catch {
      throw new Error('This page is not supported yet. Open a Canvas page or a Google Docs document in the same tab.');
    }

    if (!captured?.text?.trim() && !captured?.attachments?.length) {
      throw new Error('No readable text or linked document was found. Open the syllabus itself, then try again.');
    }
    if (captured.courseCanvasId && course.canvasCourseId && captured.courseCanvasId !== course.canvasCourseId) {
      throw new Error(`This page belongs to a different Canvas class. Find the syllabus for ${course.name} first.`);
    }

    const updatedFlow = { ...flow, tabId: activeTab.id };
    const attachments = captured.attachments ?? [];
    if (attachments.length) {
      await chrome.storage.local.set({
        syllabusSourceFlow: { ...updatedFlow, status: 'choose-source', captured },
        syllabusSourceError: null,
      });
      return { choosingSource: true };
    }

    const pageType = new URL(captured.url).hostname === 'docs.google.com' ? 'Google Docs' : 'Canvas page';
    return extractConfirmedSyllabusSource(updatedFlow, course, {
      ...captured,
      title: captured.title || pageType,
      sourceType: pageType,
    });
  },

  async chooseSyllabusSource({ attachmentIndex }) {
    const { syllabusSourceFlow: flow } = await chrome.storage.local.get('syllabusSourceFlow');
    const course = flow?.courses?.[flow.index];
    if (!course || flow.status !== 'choose-source' || !flow.captured) {
      throw new Error('Confirm a syllabus page before choosing a source.');
    }
    if (attachmentIndex == null) return extractConfirmedSyllabusSource(flow, course, flow.captured);
    const attachment = flow.captured.attachments?.[attachmentIndex];
    if (!attachment) throw new Error('That document is no longer available. Confirm the syllabus page again.');
    return extractConfirmedSyllabusSource(flow, course, flow.captured, attachment);
  },

  async saveSyllabusSourceReview({ syllabusInfo }) {
    const { syllabusSourceFlow: flow } = await chrome.storage.local.get('syllabusSourceFlow');
    const course = flow?.courses?.[flow.index];
    if (!course || flow.status !== 'review') throw new Error('Pull the syllabus before saving its details.');
    await callRise({ action: 'saveManualSyllabus', courseId: course.courseId, syllabusInfo }, await getToken());
    const nextIndex = flow.index + 1;
    if (nextIndex >= flow.courses.length) {
      await chrome.storage.local.set({ syllabusSourceFlow: { ...flow, status: 'done', review: null } });
      syncFromCanvas(flow.origin).catch(() => {});
    } else {
      await locateCurrentSyllabus({ ...flow, index: nextIndex, review: null, captured: null, suggestion: null });
    }
    return { done: nextIndex >= flow.courses.length };
  },

  async skipSyllabusSourceFlow() {
    const { syllabusSourceFlow: flow } = await chrome.storage.local.get('syllabusSourceFlow');
    if (!flow?.courses?.[flow.index]) throw new Error('There is no active class to skip.');
    const nextIndex = flow.index + 1;
    await chrome.storage.local.remove('syllabusSourceError');
    if (nextIndex >= flow.courses.length) {
      await chrome.storage.local.set({
        syllabusSourceFlow: { ...flow, status: 'done', review: null, captured: null, suggestion: null },
      });
      return { done: true };
    }
    await locateCurrentSyllabus({
      ...flow,
      index: nextIndex,
      status: 'discovering',
      review: null,
      captured: null,
      suggestion: null,
      homeOpened: false,
    });
    return { done: false };
  },

  /** Search Canvas documents first, then HTML, and extract each selected syllabus. */
  async pullSyllabusReviews({ origin, courses }) {
    const token = await getToken();
    const reviews = [];
    for (const course of courses ?? []) {
      const base = {
        courseId: course.courseId,
        courseCode: course.code,
        courseTerm: course.term,
        courseName: course.name,
        aiPull: true,
      };
      try {
        let source = await RiseCanvasApi.findSyllabusSource(origin, course.canvasCourseId);
        if (source) {
          const extracted = source.kind === 'text'
            ? await callRise({
              action: 'extractSyllabusText',
              courseId: course.courseId,
              courseName: course.name,
              syllabusText: source.text,
            }, token)
            : await (() => {
              const form = new FormData();
              form.set('courseId', course.courseId);
              form.set('courseName', course.name);
              form.set('file', source.blob, source.name);
              return callRiseFormData(form, 'extractSyllabusDocument', token);
            })();
          reviews.push({
            ...base,
            hasSyllabus: true,
            sourceName: source.name,
            sourceType: source.kind === 'text' ? 'text document' : source.type === 'application/pdf' ? 'PDF' : 'DOCX',
            syllabusInfo: extracted.syllabusInfo ?? {},
          });
          continue;
        }

        source = await RiseCanvasApi.findHtmlSyllabus(origin, course.canvasCourseId);
        if (!source) {
          reviews.push({
            ...base,
            hasSyllabus: false,
            processingError: 'No syllabus document or HTML syllabus was found. Fill in any details you know.',
            syllabusInfo: {},
          });
          continue;
        }

        const extracted = await callRise({
          action: 'extractSyllabusText',
          courseId: course.courseId,
          courseName: course.name,
          syllabusText: source.text,
        }, token);
        reviews.push({
          ...base,
          hasSyllabus: true,
          sourceName: source.name,
          sourceType: 'HTML',
          syllabusInfo: extracted.syllabusInfo ?? {},
        });
      } catch (error) {
        reviews.push({
          ...base,
          hasSyllabus: false,
          processingError: error.message || 'Could not pull this syllabus. Fill in any details you know.',
          syllabusInfo: {},
        });
      }
    }
    return { reviews };
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = messageHandlers[message?.type];

  if (!handler) {
    return false;
  }

  handler(message, sender).then(
    (result) => sendResponse({ ok: true, result }),
    (error) => sendResponse({ ok: false, error: error.message, code: error.code }),
  );

  // Keeps the message channel open for the async response.
  return true;
});
