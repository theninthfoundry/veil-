/**
 * VEIL — action resolver
 *
 * The server never returns pixel coordinates — coordinates break on reflow,
 * zoom, or a different display. Instead it returns a target the client resolves
 * itself: a data-veil-id, DOM id, or natural-language fuzzy description.
 */

(function () {
  const domUtils = typeof module !== 'undefined' && module.exports ? require('./dom-utils') : window.VeilDomUtils;
  const { labelFor, wordOverlapScore } = domUtils;

  const VEIL_ID_RE = /^el-\d+$/;
  const MIN_MATCH_SCORE = 0.3;
  const EXACT_MATCH_SCORE = 1.0;

  /**
   * @param {{id?: string, description?: string, text?: string, name?: string}} target
   * @param {Document} document
   * @returns {Element|null}
   */
  function resolveTarget(target, document) {
    if (!document || !document.querySelector) return null;
    if (!target) return null;

    if (target.id) {
      if (VEIL_ID_RE.test(target.id)) {
        const byVeilId = document.querySelector(`[data-veil-id="${target.id}"]`);
        if (byVeilId) return byVeilId;
      }
      try {
        const byDomId = (document.getElementById && document.getElementById(target.id)) || document.querySelector(`[id="${target.id}"]`);
        if (byDomId) return byDomId;
      } catch (_) {}
    }

    const desc = target.description || target.text || target.name;
    if (desc) {
      const candidates = document.querySelectorAll('[data-veil-id], button, input, a, select, textarea');
      let best = null;
      let bestScore = 0;
      candidates.forEach((el) => {
        const score = wordOverlapScore(desc, labelFor(el));
        if (score > bestScore) {
          bestScore = score;
          best = el;
        }
      });
      if (best && bestScore >= MIN_MATCH_SCORE) return best;
    }

    return null;
  }

  const actionResolverExport = { resolveTarget, MIN_MATCH_SCORE, EXACT_MATCH_SCORE };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = actionResolverExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilActionResolver = actionResolverExport;
  }
})();
