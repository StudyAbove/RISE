/* exported RiseSyllabusEvidence */
const RiseSyllabusEvidence = (() => {
  function highlight(quote) {
    if (typeof window.find !== 'function' || !quote?.trim()) return false;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    if (!window.find(quote.trim(), false, false, true, false, false, false)) return false;

    const range = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    if (!range) return true;
    if (globalThis.CSS?.highlights && typeof Highlight === 'function') {
      try {
        if (!document.getElementById('rise-syllabus-evidence-style')) {
          const style = document.createElement('style');
          style.id = 'rise-syllabus-evidence-style';
          style.textContent = '::highlight(rise-syllabus-evidence) { background-color: #f8e37b; color: #172719; text-decoration: underline 2px #78927b; }';
          (document.head || document.documentElement).append(style);
        }
        CSS.highlights.set('rise-syllabus-evidence', new Highlight(range));
        selection.removeAllRanges();
      } catch {
        // Keep the browser selection visible when custom highlights are unavailable.
      }
    }
    return true;
  }

  return { highlight };
})();
