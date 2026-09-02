/**
 * VEIL — action resolver
 *
 * The server never returns pixel coordinates — coordinates break on reflow,
 * zoom, or a different display, which is exactly the kind of thing that
 * fails live in a demo. Instead it returns a target the client resolves
 * itself: a data-veil-id if the server referenced one from the sanitized
 * context, falling back to fuzzy label matching on a natural-language
 * description.
 */

(function () {
  const domUtils = typeof module !== 'undefined' && module.exports ? require('./dom-utils') : window.VeilDomUtils;
  const { labelFor, wordOverlapScore } = domUtils;

  const VEIL_ID_RE = /^el-\d+$/;
  const MIN_MATCH_SCORE = 0.3;

  /**
   * @param {{id?: string, description?: string}} target
   * @param {Document} document
   * @returns {Element|null}
   */
  function resolveTarget(target, document) {
    if (!document || !document.querySelector) return null;
    if (!target) return null;

    if (target.id && VEIL_ID_RE.test(target.id)) {
      const byId = document.querySelector(`[data-veil-id="${target.id}"]`);
      if (byId) return byId;
    }

    if (target.description) {
      const candidates = document.querySelectorAll('[data-veil-id]');
      let best = null;
      let bestScore = 0;
      candidates.forEach((el) => {
        const score = wordOverlapScore(target.description, labelFor(el));
        if (score > bestScore) {
          bestScore = score;
          best = el;
        }
      });
      if (best && bestScore >= MIN_MATCH_SCORE) return best;
    }

    return null;
  }

  const actionResolverExport = { resolveTarget, MIN_MATCH_SCORE };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = actionResolverExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilActionResolver = actionResolverExport;
  }
})();
