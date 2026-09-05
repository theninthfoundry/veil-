/**
 * VEIL — Action Risk Classifier & Strict Authority Validator
 *
 * Enforces the core invariant:
 * "The AI gets no execution primitive that VEIL hasn't explicitly allowed."
 *
 * Local allowlist of supported actions:
 *   - CLICK, TYPE, INPUT, SCROLL, SELECT, WAIT, NONE, FINISH, NAVIGATE, TRANSFER
 *
 * Hard rejection rules:
 *   - null / invalid objects -> BLOCKED (invalid-action)
 *   - prototype pollution -> BLOCKED (prototype-pollution)
 *   - unknown / unsupported action -> BLOCKED (unsupported-action)
 *   - CLICK with x/y or without target -> BLOCKED (coordinate-target-forbidden / semantic-target-required)
 *   - TYPE without target -> BLOCKED (missing-target)
 *   - TYPE with raw plaintext value into sensitive field -> BLOCKED (plaintext-secret-forbidden)
 *   - EXECUTE_JS / eval / code injection -> BLOCKED (arbitrary-script-forbidden)
 *   - TRANSFER / monetary operation -> HIGH_RISK (requires-human-authorization)
 */

(function () {
  const RISK_VERSION = '1.4.1';

  const ALLOWED_ACTIONS = new Set([
    'CLICK', 'TYPE', 'INPUT', 'SCROLL', 'SELECT', 'WAIT', 'NONE', 'FINISH', 'NAVIGATE', 'TRANSFER'
  ]);

  const HIGH_RISK_KEYWORDS = [
    'pay', 'buy', 'purchase', 'order', 'checkout', 'transfer', 'delete',
    'remove', 'terminate', 'cancel subscription', 'change password', 'wipe',
    'withdraw', 'send money', 'imps', 'neft', 'rtgs'
  ];

  const SENSITIVE_KEYWORDS = [
    'submit', 'send', 'upload', 'save', 'confirm', 'apply', 'register', 'sign up'
  ];

  /**
   * Validates structural and semantic action permissions against strict allowlist.
   *
   * @param {object} action - Proposed action object
   * @param {Element|null} [targetElement] - Resolved DOM element
   * @param {Set<Element>} [sensitiveElements] - Set of sensitive DOM elements
   * @returns {{
   *   level: 'SAFE'|'SENSITIVE'|'HIGH_RISK'|'BLOCKED',
   *   allowed: boolean,
   *   requiresConfirmation: boolean,
   *   reason: string,
   *   error?: string
   * }}
   */
  function classifyActionRisk(action, targetElement, sensitiveElements, options = {}) {
    // 0. Delegate to Canonical Policy Decision Point if available
    let engine = null;
    if (typeof window !== 'undefined' && window.VeilPolicyEngine && window.VeilPolicyEngine.defaultPolicyEngine) {
      engine = window.VeilPolicyEngine.defaultPolicyEngine;
    } else if (typeof require !== 'undefined') {
      try {
        const pe = require('./policy-engine');
        engine = pe.defaultPolicyEngine || (pe.PolicyEngine ? new pe.PolicyEngine() : null);
      } catch (_) {}
    }

    if (engine && typeof engine.decide === 'function') {
      const res = engine.decide({
        action,
        targetElement,
        sensitiveElements,
        origin: options.origin || '',
        session: options.session || null,
        budget: options.budget || null
      });
      return {
        level: res.riskLevel,
        allowed: res.allowed,
        requiresConfirmation: res.requiresConfirmation,
        requiresHuman: res.requiresHuman,
        reason: res.reason,
        error: res.error,
        decision: res.decision,
        policyVersion: res.policyVersion,
        requiredCapabilities: res.requiredCapabilities
      };
    }

    // 1. Standalone Fallback: Validate Input Structure
    if (!action || typeof action !== 'object' || Array.isArray(action)) {
      return { level: 'BLOCKED', allowed: false, requiresConfirmation: false, error: 'invalid-action', reason: 'Invalid or null action payload' };
    }

    // 2. Reject Prototype Pollution / Direct Own-Property Injections
    if (Object.prototype.hasOwnProperty.call(action, '__proto__') || (Object.prototype.hasOwnProperty.call(action, 'constructor') && typeof action.constructor !== 'function')) {
      return { level: 'BLOCKED', allowed: false, requiresConfirmation: false, error: 'prototype-pollution', reason: 'Suspicious own-property prototype structure' };
    }

    const rawType = String(action.type || action.action || '').toUpperCase().trim();

    // 3. Reject Arbitrary Code / Script Execution Primitives
    if (rawType === 'EXECUTE_JS' || rawType === 'EVAL' || rawType === 'SCRIPT' || action.code !== undefined || action.script !== undefined) {
      return { level: 'BLOCKED', allowed: false, requiresConfirmation: false, error: 'arbitrary-script-forbidden', reason: 'Arbitrary script/JavaScript execution is strictly forbidden by local authority' };
    }

    // 4. Reject Raw Pixel Coordinates
    if (action.x !== undefined || action.y !== undefined || action.coordinates !== undefined) {
      return { level: 'BLOCKED', allowed: false, requiresConfirmation: false, error: 'coordinate-target-forbidden', reason: 'Coordinate-based clicking (x/y) is forbidden; semantic element targets required' };
    }

    // 5. Check Against Strict Allowlist
    if (!rawType || !ALLOWED_ACTIONS.has(rawType)) {
      return { level: 'BLOCKED', allowed: false, requiresConfirmation: false, error: 'unsupported-action', reason: `Action type "${rawType || 'EMPTY'}" is not in the allowed execution primitives set` };
    }

    // 6. Monetary Transfers & High-Stakes Operations
    if (rawType === 'TRANSFER' || action.amount !== undefined) {
      return {
        level: 'HIGH_RISK',
        allowed: false,
        requiresConfirmation: true,
        reason: 'Monetary transfer action requires explicit human authorization'
      };
    }

    // 7. Safe Viewport / No-Op Actions
    if (rawType === 'WAIT' || rawType === 'NONE' || rawType === 'SCROLL' || rawType === 'FINISH') {
      return { level: 'SAFE', allowed: true, requiresConfirmation: false, reason: 'Safe viewport / no-op action' };
    }

    // 8. Require Semantic Target for Targeted Actions (CLICK, TYPE, INPUT, SELECT)
    if ((rawType === 'CLICK' || rawType === 'TYPE' || rawType === 'INPUT' || rawType === 'SELECT') && !action.target && !targetElement) {
      return {
        level: 'BLOCKED',
        allowed: false,
        requiresConfirmation: false,
        error: 'missing-target',
        reason: 'Missing semantic target: targeted action must specify a target element identifier'
      };
    }

    // 9. ValueRef typing: Authorized via Local Secret Vault
    if ((rawType === 'TYPE' || rawType === 'INPUT') && action.valueRef) {
      return {
        level: 'SENSITIVE',
        allowed: true,
        requiresConfirmation: false,
        reason: `Authorized Local Secret Injection (${action.valueRef}) via Vault`
      };
    }

    // 10. Hard security rule: Never allow raw plaintext typing into sensitive fields
    const isTargetSensitive = (targetElement && sensitiveElements && sensitiveElements.has(targetElement)) || (action.target && action.target.sensitive === true);
    if ((rawType === 'TYPE' || rawType === 'INPUT') && action.value !== undefined && isTargetSensitive) {
      return {
        level: 'BLOCKED',
        allowed: false,
        requiresConfirmation: false,
        error: 'plaintext-secret-forbidden',
        reason: 'Strict Policy: Remote model cannot pass raw values into a sensitive/redacted field (must use valueRef)'
      };
    }

    const desc = ((action.target && (action.target.description || action.target.text || action.target.name || action.target.id)) || '').toLowerCase();
    const elText = (targetElement && targetElement !== targetElement.ownerDocument.body ? (targetElement.textContent || targetElement.getAttribute('aria-label') || targetElement.getAttribute('name') || targetElement.getAttribute('id') || '') : '').toLowerCase();
    const combined = `${rawType.toLowerCase()} ${desc} ${elText}`;

    // 11. Check HIGH_RISK Keywords
    for (const kw of HIGH_RISK_KEYWORDS) {
      if (combined.includes(kw)) {
        return {
          level: 'HIGH_RISK',
          allowed: false,
          requiresConfirmation: true,
          reason: `Action involves high-stakes keyword "${kw}" (monetary / irreversible operation)`
        };
      }
    }

    // 12. Check SENSITIVE Keywords
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

    // 13. Standard Navigation & Click Interactions
    return {
      level: 'SAFE',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Standard navigation / interaction element'
    };
  }

  const riskClassifierExport = {
    classifyActionRisk,
    validateAction: classifyActionRisk,
    ALLOWED_ACTIONS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = riskClassifierExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilRiskClassifier = riskClassifierExport;
  }
})();
