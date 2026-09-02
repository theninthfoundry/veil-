/**
 * VEIL — shared DOM helpers
 *
 * Pure, browser/jsdom-portable. No chrome.* APIs.
 */

(function () {
  /** Human-readable label for an interactive element: what a person would call it. */
  function labelFor(el) {
    if (!el || typeof el !== 'object') return '';
    const aria = el.getAttribute && el.getAttribute('aria-label');
    if (aria && aria.trim()) return aria.trim();

    if (el.id) {
      const doc = el.ownerDocument;
      const labels = doc.querySelectorAll('label');
      for (const l of labels) {
        if (l.htmlFor === el.id) {
          const t = l.textContent.trim();
          if (t) return t;
        }
      }
    }

    const closestLabel = el.closest && el.closest('label');
    if (closestLabel && closestLabel.textContent.trim()) {
      return closestLabel.textContent.trim().slice(0, 80);
    }

    const placeholder = el.getAttribute && el.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) return placeholder.trim();

    const text = (el.textContent || '').trim();
    if (text) return text.slice(0, 80);

    return el.getAttribute('name') || el.getAttribute('id') || el.tagName.toLowerCase();
  }

  function normalize(s) {
    return (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Jaccard word overlap between two strings, 0..1. */
  function wordOverlapScore(a, b) {
    const wa = new Set(normalize(a).split(' ').filter(Boolean));
    const wb = new Set(normalize(b).split(' ').filter(Boolean));
    if (wa.size === 0 || wb.size === 0) return 0;
    let intersect = 0;
    for (const w of wa) if (wb.has(w)) intersect += 1;
    const union = new Set([...wa, ...wb]).size;
    return intersect / union;
  }

  const domUtilsExport = { labelFor, normalize, wordOverlapScore };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = domUtilsExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilDomUtils = domUtilsExport;
  }
})();
