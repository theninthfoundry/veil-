/**
 * VEIL — Action Executor & Capability Enforcement Gate
 *
 * Implements Invariant I1 & I3:
 *   1. Plaintext Typing into Sensitive Fields: BLOCKED outright.
 *   2. Capability Enforcement: Actions carrying a capabilityId MUST be validated and atomically
 *      consumed by the VEIL Capability Manager before dispatch.
 *   3. Value Reference Typing (valueRef: "LOCAL_SECRET_01"): Authorized via Local Secret Vault,
 *      domain boundary check, and field scope verification. The secret value is resolved ONLY
 *      inside this function and injected directly into the DOM element.
 *   4. Safe DOM Event Dispatch: click, scroll, type, input, change.
 */

(function () {
  const secretVault = typeof module !== 'undefined' && module.exports
    ? require('./secret-vault')
    : (typeof window !== 'undefined' ? window.VeilSecretVault : null);

  const capabilityManager = typeof module !== 'undefined' && module.exports
    ? require('./capability-manager')
    : (typeof window !== 'undefined' ? window.VeilCapabilityManager : null);

  const stateHasher = typeof module !== 'undefined' && module.exports
    ? require('./state-hasher')
    : (typeof window !== 'undefined' ? window.VeilStateHasher : null);

  /**
   * @param {{type: 'click'|'type'|'scroll'|'wait'|'none', value?: string, valueRef?: string, capabilityId?: string, stateHash?: string}} action
   * @param {Element|null} element
   * @param {Set<Element>} sensitiveElements — elements the detector flagged this pass
   * @param {string} [currentOrigin] — window.location.hostname or origin
   * @returns {{ok: boolean, reason?: string, secretUsed?: boolean, secretId?: string, label?: string, capabilityConsumed?: boolean}}
   */
  function executeAction(action, element, sensitiveElements, currentOrigin = 'localhost') {
    if (!action || action.type === 'wait' || action.type === 'none') {
      return { ok: true, reason: 'no-op' };
    }

    if (!element) {
      return { ok: false, reason: 'no-target-resolved' };
    }

    const actionType = String(action.type || '').toLowerCase();
    const isSensitive = sensitiveElements && sensitiveElements.has(element);
    const targetFingerprint = stateHasher && stateHasher.computeElementFingerprint
      ? stateHasher.computeElementFingerprint(element)
      : (element.id || element.tagName.toLowerCase());

    // --- CAPABILITY VALIDATION & CONSUMPTION ---
    let capabilityRecord = null;
    if (action.capabilityId && capabilityManager && capabilityManager.consumeCapability) {
      const consumeRes = capabilityManager.consumeCapability(action.capabilityId, {
        origin: currentOrigin,
        actionType: actionType.toUpperCase(),
        targetFingerprint,
        stateHash: action.stateHash
      });

      if (!consumeRes.ok) {
        return {
          ok: false,
          reason: `capability-denied: ${consumeRes.reason}`,
          capabilityId: action.capabilityId
        };
      }
      capabilityRecord = consumeRes.capability;
    }

    // --- TYPE ACTION RESOLUTION ---
    if (actionType === 'type') {
      let textToInject = (action.value != null ? String(action.value) : '').slice(0, 1000);
      let secretMetadata = null;

      // Path A: Value Reference Resolution (MANDATORY CAPABILITY & SECRET AUTHORIZATION)
      if (action.valueRef) {
        if (!action.capabilityId || !capabilityRecord) {
          return {
            ok: false,
            reason: 'SECURITY_VIOLATION: ValueRef resolution strictly requires an authorized Action Capability.'
          };
        }

        const fieldId = element.getAttribute('name') || element.getAttribute('id') || element.getAttribute('autocomplete') || '';
        const authorizedSecretId = capabilityRecord.secretId || action.valueRef;

        let vaultRes;
        if (secretVault && secretVault.resolveSecret) {
          vaultRes = secretVault.resolveSecret(authorizedSecretId, currentOrigin, fieldId);
        } else {
          vaultRes = { ok: false, reason: 'vault-unavailable' };
        }

        if (!vaultRes.ok) {
          return { ok: false, reason: vaultRes.reason, secretId: authorizedSecretId };
        }

        textToInject = vaultRes.value;
        secretMetadata = {
          secretUsed: true,
          secretId: vaultRes.secretId,
          label: vaultRes.label,
          capabilityId: action.capabilityId
        };
      }
      // Path B: Authorized Plaintext Typing with Capability
      else if (action.capabilityId) {
        secretMetadata = {
          secretUsed: false,
          capabilityId: action.capabilityId
        };
      }
      // Path C: Remote attempted raw typing into sensitive element without Capability -> BLOCK
      else if (isSensitive) {
        return { ok: false, reason: 'plaintext-typing-blocked: blocked-sensitive-field: Typing into sensitive field strictly requires Capability authorization' };
      }

      // Perform native DOM injection
      element.focus();
      element.value = textToInject;

      const win = (element.ownerDocument && element.ownerDocument.defaultView) || (typeof window !== 'undefined' ? window : globalThis);
      element.dispatchEvent(new win.Event('input', { bubbles: true }));
      element.dispatchEvent(new win.Event('change', { bubbles: true }));
      element.dispatchEvent(new win.Event('blur', { bubbles: true }));

      return {
        ok: true,
        capabilityConsumed: Boolean(capabilityRecord),
        ...(secretMetadata || {})
      };
    }

    // --- CLICK ACTION ---
    if (actionType === 'click') {
      element.click();
      return {
        ok: true,
        capabilityConsumed: Boolean(capabilityRecord)
      };
    }

    // --- SCROLL ACTION ---
    if (actionType === 'scroll') {
      if (typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return {
        ok: true,
        capabilityConsumed: Boolean(capabilityRecord)
      };
    }

    return { ok: false, reason: `unknown-action-type: ${action.type}` };
  }

  const actionExecutorExport = { executeAction };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = actionExecutorExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilActionExecutor = actionExecutorExport;
  }
})();
