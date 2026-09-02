/**
 * VEIL — action executor
 *
 * The local security execution boundary:
 *   1. Plaintext Typing into Sensitive Fields: BLOCKED outright.
 *   2. Value Reference Typing (valueRef: "LOCAL_SECRET_01"): Authorized via Local Secret Vault,
 *      domain boundary check, and field scope verification. The secret value is resolved ONLY
 *      inside this function and injected into the DOM element.
 *   3. Click, scroll, select: Executed safely on-device.
 */

(function () {
  const secretVault = typeof module !== 'undefined' && module.exports ? require('./secret-vault') : window.VeilSecretVault;

  /**
   * @param {{type: 'click'|'type'|'scroll'|'wait'|'none', value?: string, valueRef?: string}} action
   * @param {Element|null} element
   * @param {Set<Element>} sensitiveElements — elements the detector flagged this pass
   * @param {string} [currentOrigin] — window.location.hostname
   * @returns {{ok: boolean, reason?: string, secretUsed?: boolean, secretId?: string, label?: string}}
   */
  function executeAction(action, element, sensitiveElements, currentOrigin = 'localhost') {
    if (!action || action.type === 'wait' || action.type === 'none') {
      return { ok: true, reason: 'no-op' };
    }

    if (!element) {
      return { ok: false, reason: 'no-target-resolved' };
    }

    const isSensitive = sensitiveElements && sensitiveElements.has(element);

    // --- TYPE ACTION RESOLUTION ---
    if (action.type === 'type') {
      let textToInject = action.value || '';
      let secretMetadata = null;

      // Path A: Local Secret Reference Resolution (valueRef)
      if (action.valueRef) {
        const fieldId = element.getAttribute('name') || element.getAttribute('id') || element.getAttribute('autocomplete') || '';
        const vaultRes = secretVault.resolveSecret(action.valueRef, currentOrigin, fieldId);

        if (!vaultRes.ok) {
          return { ok: false, reason: vaultRes.reason, secretId: action.valueRef };
        }

        textToInject = vaultRes.value;
        secretMetadata = { secretUsed: true, secretId: vaultRes.secretId, label: vaultRes.label };
      }
      // Path B: Remote attempted raw typing into sensitive element without ValueRef -> BLOCK
      else if (isSensitive) {
        return { ok: false, reason: 'blocked-sensitive-field' };
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
        ...(secretMetadata || {})
      };
    }

    // --- CLICK ACTION ---
    if (action.type === 'click') {
      element.click();
      return { ok: true };
    }

    // --- SCROLL ACTION ---
    if (action.type === 'scroll') {
      if (typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return { ok: true };
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
