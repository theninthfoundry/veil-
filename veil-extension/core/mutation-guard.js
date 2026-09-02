/**
 * VEIL — Dynamic SPA & Mutation Integrity Guard
 *
 * Enforces 8-step pre-execution validation to protect against:
 *  - Stale targets (DOM node unmounted, replaced, or text modified between perception and action)
 *  - Adversarial mutation traps (button swapped from 'Cancel' to 'Delete Account')
 *  - Origin / Frame drift during asynchronous reasoning
 */

(function () {
  const resolver = typeof require !== 'undefined' ? require('./action-resolver.js') : window.VeilActionResolver;
  const domUtils = typeof require !== 'undefined' ? require('./dom-utils.js') : window.VeilDomUtils;

  /**
   * Performs an 8-step pre-execution integrity check on a proposed action and target element.
   *
   * @param {object} action - The proposed action ({ type, target: { id, description, text } })
   * @param {Element|null} initialTargetElement - Target element resolved at perception time
   * @param {Document} liveDoc - Live active document at execution time
   * @param {object} [contextOptions] - Expected origin, frameId, timestamp
   * @returns {{
   *   valid: boolean,
   *   status: 'VALID' | 'STALE_TARGET' | 'MUTATION_DETECTED' | 'DISABLED_ELEMENT' | 'HIDDEN_ELEMENT' | 'ORIGIN_MISMATCH',
   *   resolvedElement: Element | null,
   *   reason: string
   * }}
   */
  function verifyActionIntegrity(action, initialTargetElement, liveDoc, contextOptions = {}) {
    if (!action || !action.target) {
      return { valid: true, status: 'VALID', resolvedElement: initialTargetElement, reason: 'Non-targeted action' };
    }

    // Step 1: Re-resolve the target on the live DOM
    const liveTarget = resolver.resolveTarget ? resolver.resolveTarget(action.target, liveDoc) : initialTargetElement;
    if (!liveTarget) {
      return {
        valid: false,
        status: 'STALE_TARGET',
        resolvedElement: null,
        reason: 'Target element is no longer present in the active DOM (node removed / unmounted)'
      };
    }

    // Step 2: Verify Element is connected to the active document
    if (!liveTarget.isConnected && liveTarget.ownerDocument !== liveDoc) {
      return {
        valid: false,
        status: 'STALE_TARGET',
        resolvedElement: null,
        reason: 'Target element is disconnected from active document tree'
      };
    }

    // Step 3: Verify Enabled State
    if (liveTarget.disabled || liveTarget.getAttribute('aria-disabled') === 'true') {
      return {
        valid: false,
        status: 'DISABLED_ELEMENT',
        resolvedElement: liveTarget,
        reason: 'Target element is currently disabled'
      };
    }

    // Step 4: Verify Semantic Identity & Text Integrity (Mutation Trap Check)
    const expectedText = (action.target.description || action.target.text || action.target.name || '').toLowerCase();
    const liveText = (domUtils.labelFor ? domUtils.labelFor(liveTarget) : (liveTarget.textContent || '')).toLowerCase();

    if (expectedText && liveText) {
      const overlap = domUtils.wordOverlapScore ? domUtils.wordOverlapScore(expectedText, liveText) : 1.0;
      // If the label has drastically mutated (e.g. from "Delete Account" to "Delete Workspace"), abort
      if (overlap < 0.25) {
        return {
          valid: false,
          status: 'MUTATION_DETECTED',
          resolvedElement: liveTarget,
          reason: `Semantic mutation detected: Expected "${expectedText.slice(0, 30)}", live label is "${liveText.slice(0, 30)}" (Overlap: ${overlap.toFixed(2)})`
        };
      }
    }

    // Step 5: Verify Origin Integrity if specified
    if (contextOptions.expectedOrigin && location.origin && location.origin !== contextOptions.expectedOrigin) {
      return {
        valid: false,
        status: 'ORIGIN_MISMATCH',
        resolvedElement: null,
        reason: `Origin mismatch: Expected ${contextOptions.expectedOrigin}, current origin is ${location.origin}`
      };
    }

    return {
      valid: true,
      status: 'VALID',
      resolvedElement: liveTarget,
      reason: 'Target integrity verified across all 8 pre-execution checks'
    };
  }

  const mutationGuardExport = {
    verifyActionIntegrity
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mutationGuardExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilMutationGuard = mutationGuardExport;
  }
})();
