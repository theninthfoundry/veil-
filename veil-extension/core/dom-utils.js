/**
 * VEIL — shared DOM & Frame Perception helpers
 *
 * Supports recursive traversal across:
 *   - Standard Light DOM
 *   - Open Shadow Roots (and nested Shadow DOM)
 *   - Same-Origin and isolated iframe boundaries
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
      const doc = el.ownerDocument || (el.getRootNode && el.getRootNode());
      if (doc && doc.querySelectorAll) {
        const labels = doc.querySelectorAll('label');
        for (const l of labels) {
          if (l.htmlFor === el.id) {
            const t = l.textContent.trim();
            if (t) return t;
          }
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
    if (wa.size === wb.size && [...wa].every(x => wb.has(x))) return 1.0;
    let intersect = 0;
    for (const w of wa) if (wb.has(w)) intersect += 1;
    const union = new Set([...wa, ...wb]).size;
    return intersect / union;
  }

  /**
   * Recursively traverses all DOM nodes including open shadow roots.
   * @param {Node|Element|Document} root
   * @param {Function} callback - Invoked for each visited element
   * @param {string} [shadowPath=''] - Current shadow root nesting path
   */
  function traverseAllNodes(root, callback, shadowPath = '') {
    if (!root) return;

    const walker = (node, path) => {
      if (!node) return;
      if (node.nodeType === 1 /* ELEMENT_NODE */) {
        callback(node, path);

        // Traverse open Shadow Root if present
        if (node.shadowRoot) {
          const newPath = path ? `${path} > ${node.tagName.toLowerCase()}` : node.tagName.toLowerCase();
          for (const child of node.shadowRoot.childNodes) {
            walker(child, newPath);
          }
        }
      }

      for (const child of node.childNodes || []) {
        walker(child, path);
      }
    };

    walker(root, shadowPath);
  }

  /**
   * Recursively queries interactive elements across light DOM and shadow roots.
   * @param {Document|Element} root
   * @param {object} [frameInfo] - { frameId: string, origin: string }
   * @returns {Array<Element>}
   */
  function queryAllInteractiveElements(root, frameInfo = { frameId: 'top', origin: 'self' }) {
    const interactive = [];
    const targetTags = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A']);

    traverseAllNodes(root, (el, shadowPath) => {
      const tag = el.tagName;
      if (targetTags.has(tag) || el.getAttribute('role') === 'button' || el.getAttribute('role') === 'textbox' || el.isContentEditable) {
        // Tag element with frame context metadata
        el._veilFrameInfo = {
          frameId: frameInfo.frameId,
          origin: frameInfo.origin,
          shadowPath: shadowPath || 'light-dom'
        };
        interactive.push(el);
      }
    });

    return interactive;
  }

  const domUtilsExport = {
    labelFor,
    normalize,
    wordOverlapScore,
    traverseAllNodes,
    queryAllInteractiveElements
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = domUtilsExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilDomUtils = domUtilsExport;
  }
})();
