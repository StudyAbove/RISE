// Read the visible Google Docs text only after the user confirms this page.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'captureSyllabusPage') return false;

  const renderedLines = [...document.querySelectorAll('.kix-lineview-text-block')]
    .map((line) => line.innerText || line.textContent || '')
    .join('\n')
    .trim();
  const bodyText = document.body?.innerText?.trim() ?? '';
  const text = renderedLines.length > bodyText.length ? renderedLines : bodyText;
  sendResponse({
    ok: true,
    result: {
      url: location.href,
      title: document.title,
      courseCanvasId: null,
      text: text.slice(0, 80000),
    },
  });
  return false;
});
