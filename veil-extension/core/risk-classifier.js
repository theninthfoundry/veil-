/**
 * VEIL — Action Risk Classifier
 *
 * Classifies proposed browser actions into risk tiers:
 *   - SAFE: scroll, expand, navigate, open menu -> automatic execution
 *   - SENSITIVE: submit form, send message, local secret reference injection (valueRef) -> logged + monitored
 *   - HIGH_RISK: purchase, pay, transfer, delete account, confirm order -> flagged for confirmation
 *   - BLOCKED: raw plaintext typing into sensitive/redacted fields
 *
 * Enforces:
 *   - Semantic access != Execution authority
 *   - Remote LLM can propose valueRef, but local engine classifies and gates.
 */

(function () {
  const HIGH_RISK_KEYWORDS = [
    'pay', 'buy', 'purchase', 'order', 'checkout', 'transfer', 'delete',
    'remove', 'terminate', 'cancel subscription', 'change password', 'wipe'
  ];

  const SENSITIVE_KEYWORDS = [
    'submit', 'send', 'upload', 'save', 'confirm', 'apply', 'register', 'sign up'
  ];

  /**
   * @param {{type: string, value?: string, valueRef?: string, target?: {description?: string, role?: string, text?: string}}} action
   * @param {Element|null} targetElement
   * @param {Set<Element>} sensitiveElements
   * @returns {{
   *   level: 'SAFE'|'SENSITIVE'|'HIGH_RISK'|'BLOCKED',
   *   allowed: boolean,
   *   requiresConfirmation: boolean,
   *   reason: string
   * }}
   */
  function classifyActionRisk(action, targetElement, sensitiveElements) {
    if (!action || action.type === 'wait' || action.type === 'none' || action.type === 'scroll') {
      return { level: 'SAFE', allowed: true, requiresConfirmation: false, reason: 'Safe viewport/no-op action' };
    }

    // ValueRef typing: Authorized via Local Secret Vault
    if (action.type === 'type' && action.valueRef) {
      return {
        level: 'SENSITIVE',
        allowed: true,
        requiresConfirmation: false,
        reason: `Authorized Local Secret Injection (${action.valueRef}) via Vault`
      };
    }

    // Hard security rule: Never allow raw plaintext typing into sensitive fields
    if (action.type === 'type' && targetElement && sensitiveElements && sensitiveElements.has(targetElement)) {
      return {
        level: 'BLOCKED',
        allowed: false,
        requiresConfirmation: false,
        reason: 'Strict Policy: Remote model cannot pass raw values into a sensitive/redacted field (must use valueRef)'
      };
    }

    const desc = ((action.target && (action.target.description || action.target.text)) || '').toLowerCase();
    const elText = (targetElement && targetElement !== targetElement.ownerDocument.body ? (targetElement.textContent || targetElement.getAttribute('aria-label') || targetElement.getAttribute('name') || '') : '').toLowerCase();
    const combined = `${desc} ${elText}`;

    // Check HIGH_RISK
    for (const kw of HIGH_RISK_KEYWORDS) {
      if (combined.includes(kw)) {
        return {
          level: 'HIGH_RISK',
          allowed: true,
          requiresConfirmation: true,
          reason: `Action involves high-stakes keyword "${kw}" (e.g. monetary/irreversible transaction)`
        };
      }
    }

    // Check SENSITIVE
    for (const kw of SENSITIVE_KEYWORDS) {
      if (combined.includes(kw)) {
        return {
          level: 'SENSITIVE',
          allowed: true,
          requiresConfirmation: false,
          reason: `Action performs a state-modifying action matching "${kw}"`
        };
      }
    }

    // Safe by default for read/navigation actions (click navigation links)
    return {
      level: 'SAFE',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Standard navigation / interaction element'
    };
  }

  const riskClassifierExport = { classifyActionRisk };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = riskClassifierExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilRiskClassifier = riskClassifierExport;
  }
})();
