/* global RiseSyllabusEvidence */
// Read the visible Google Docs text only after the user confirms this page.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'highlightSyllabusEvidence') {
    sendResponse({ ok: true, result: { highlighted: RiseSyllabusEvidence.highlight(message.quote) } });
    return false;
  }
  if (message?.type !== 'captureSyllabusPage') return false;

  const renderedLines = [...document.querySelectorAll('.kix-lineview-text-block')]
    .map((line) => line.innerText || line.textContent || '')
    .join('\n')
    .trim();
  const bodyText = document.body?.innerText?.trim() ?? '';
  const text = renderedLines.length > bodyText.length ? renderedLines : bodyText;
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
  sendResponse({
    ok: true,
    result: {
      url: location.href,
      title: document.title,
      courseCanvasId: null,
      text: text.slice(0, 80000),
      pageLinks,
    },
  });
  return false;
});
