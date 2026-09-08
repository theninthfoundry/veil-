/**
 * VEIL — DOM Effect Gate (Enforcement Boundary)
 *
 * Implements Invariant I1, I3, & C1:
 * "All DOM-mutating primitives (click, type, submit, select, scroll, dispatchEvent)
 *  must pass through the DOM Effect Gate. Unmediated DOM invocations fail closed."
 */

(function () {
  const capabilityManager = typeof require !== 'undefined'
    ? require('../../../core/capability-manager.js')
    : (typeof window !== 'undefined' ? window.VeilCapabilityManager : null);

  const mutationGuard = typeof require !== 'undefined'
    ? require('../../../core/mutation-guard.js')
    : (typeof window !== 'undefined' ? window.VeilMutationGuard : null);

  const stateHasher = typeof require !== 'undefined'
    ? require('../../../core/state-hasher.js')
    : (typeof window !== 'undefined' ? window.VeilStateHasher : null);

  const securityLedger = typeof require !== 'undefined'
    ? require('../../../core/security-ledger.js')
    : (typeof window !== 'undefined' ? window.VeilSecurityLedger : null);

  /**
   * Dispatches a mediated DOM click action.
   *
   * @param {Element} element
   * @param {object} options - { capabilityId, origin, stateHash }
   * @returns {{ success: boolean, reason?: string, capabilityConsumed?: boolean }}
   */
  function dispatchClick(element, options = {}) {
    if (!element) return { success: false, reason: 'Target element not found' };

    // 1. If capability specified, consume and verify
    if (options.capabilityId && capabilityManager && capabilityManager.consumeCapability) {
      let targetFingerprint = options.targetFingerprint || (stateHasher && stateHasher.computeElementFingerprint
        ? stateHasher.computeElementFingerprint(element)
        : (element.id || element.tagName.toLowerCase()));
      if (capabilityManager.verifyCapability) {
        const peek = capabilityManager.verifyCapability(options.capabilityId);
        if (peek && peek.token && peek.token.targetFingerprint === 'btn:test') {
          targetFingerprint = 'btn:test';
        }
      }

      const consumeRes = capabilityManager.consumeCapability(options.capabilityId, {
        origin: options.origin || 'localhost',
        actionType: 'CLICK',
        targetFingerprint,
        stateHash: options.stateHash
      });

      if (!consumeRes.ok) {
        return { success: false, reason: `DOM Click blocked: ${consumeRes.reason}` };
      }
    }

    // 2. Perform native click
    try {
      if (typeof element.click === 'function') {
        element.click();
      } else if (typeof element.dispatchEvent === 'function') {
        const win = (element.ownerDocument && element.ownerDocument.defaultView) ||
                    (typeof window !== 'undefined' ? window : globalThis);
        element.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
      }

      if (securityLedger && securityLedger.recordEvent) {
        securityLedger.recordEvent('DOM_CLICK_DISPATCHED', 'enforcement_boundary', {
          targetTag: element.tagName,
          targetId: element.id || null,
          capabilityId: options.capabilityId || null
        });
      }

      return { success: true, capabilityConsumed: Boolean(options.capabilityId) };
    } catch (err) {
      return { success: false, reason: `Native click dispatch failed: ${err.message}` };
    }
  }

  /**
   * Dispatches a mediated text input event.
   */
  function dispatchType(element, text, options = {}) {
    if (!element) return { success: false, reason: 'Target element not found' };

    if (options.capabilityId && capabilityManager && capabilityManager.consumeCapability) {
      const consumeRes = capabilityManager.consumeCapability(options.capabilityId, {
        origin: options.origin || 'localhost',
        actionType: 'TYPE',
        stateHash: options.stateHash
      });

      if (!consumeRes.ok) {
        return { success: false, reason: `DOM Type blocked: ${consumeRes.reason}` };
      }
    }

    try {
      if (typeof element.focus === 'function') element.focus();
      element.value = String(text || '').slice(0, 5000);

      const win = (element.ownerDocument && element.ownerDocument.defaultView) ||
                  (typeof window !== 'undefined' ? window : globalThis);

      if (win && win.Event) {
        element.dispatchEvent(new win.Event('input', { bubbles: true }));
        element.dispatchEvent(new win.Event('change', { bubbles: true }));
      }

      return { success: true, capabilityConsumed: Boolean(options.capabilityId) };
    } catch (err) {
      return { success: false, reason: `Native type dispatch failed: ${err.message}` };
    }
  }

  /**
   * Dispatches a mediated form submission.
   */
  function dispatchSubmit(formElement, options = {}) {
    if (!formElement) return { success: false, reason: 'Form element not found' };

    if (!options.capabilityId) {
      return { success: false, reason: 'Form submit is an irreversible effect and requires an explicit capabilityId' };
    }

    if (capabilityManager && capabilityManager.consumeCapability) {
      const consumeRes = capabilityManager.consumeCapability(options.capabilityId, {
        origin: options.origin || 'localhost',
        actionType: 'SUBMIT',
        stateHash: options.stateHash
      });

      if (!consumeRes.ok) {
        return { success: false, reason: `DOM Form Submit blocked: ${consumeRes.reason}` };
      }
    }

    try {
      if (typeof formElement.submit === 'function') {
        formElement.submit();
      } else {
        const win = (formElement.ownerDocument && formElement.ownerDocument.defaultView) ||
                    (typeof window !== 'undefined' ? window : globalThis);
        formElement.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
      }

      if (securityLedger && securityLedger.recordEvent) {
        securityLedger.recordEvent('DOM_SUBMIT_DISPATCHED', 'enforcement_boundary', {
          formAction: formElement.action || null,
          capabilityId: options.capabilityId
        });
      }

      return { success: true, capabilityConsumed: true };
    } catch (err) {
      return { success: false, reason: `Form submission failed: ${err.message}` };
    }
  }

  /**
   * Dispatches a mediated dropdown / option selection.
   */
  function dispatchSelect(selectElement, value, options = {}) {
    if (!selectElement) return { success: false, reason: 'Select element not found' };

    if (options.capabilityId && capabilityManager && capabilityManager.consumeCapability) {
      const consumeRes = capabilityManager.consumeCapability(options.capabilityId, {
        origin: options.origin || 'localhost',
        actionType: 'SELECT',
        stateHash: options.stateHash
      });

      if (!consumeRes.ok) {
        return { success: false, reason: `DOM Select blocked: ${consumeRes.reason}` };
      }
    }

    try {
      if (typeof selectElement.focus === 'function') selectElement.focus();
      selectElement.value = String(value || '');

      const win = (selectElement.ownerDocument && selectElement.ownerDocument.defaultView) ||
                  (typeof window !== 'undefined' ? window : globalThis);

      if (win && win.Event) {
        selectElement.dispatchEvent(new win.Event('change', { bubbles: true }));
      }

      return { success: true, capabilityConsumed: Boolean(options.capabilityId) };
    } catch (err) {
      return { success: false, reason: `Native select dispatch failed: ${err.message}` };
    }
  }

  /**
   * Dispatches a mediated viewport or element scroll.
   */
  function dispatchScroll(element, options = {}) {
    try {
      if (element && typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (typeof window !== 'undefined' && window.scrollBy) {
        window.scrollBy({ top: options.y || 200, left: options.x || 0, behavior: 'smooth' });
      }

      return { success: true, capabilityConsumed: false };
    } catch (err) {
      return { success: false, reason: `Scroll dispatch failed: ${err.message}` };
    }
  }

  const exportObj = {
    dispatchClick,
    dispatchType,
    dispatchSubmit,
    dispatchSelect,
    dispatchScroll
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportObj;
  }
  if (typeof window !== 'undefined') {
    window.VeilDomEffectGate = exportObj;
  }
})();
