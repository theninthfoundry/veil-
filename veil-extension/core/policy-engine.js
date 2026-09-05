/**
 * VEIL — User-Controlled Policy Engine
 *
 * Provides granular, user-configurable security rules governing what AI agents
 * are permitted to observe, reason about, and execute.
 */

(function () {
  const POLICY_VERSION = '2.0.0';

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

  const DEFAULT_POLICY = {
    privacy: {
      blockPII: true,
      blockCredentials: true,
      blockFinancial: true,
      blockBiometric: true
    },
    actions: {
      confirmPurchases: true,
      confirmTransfers: true,
      confirmAccountDeletion: true,
      confirmDownloads: true,
      allowDirectClicksOnSafeButtons: true
    },
    agent: {
      maxSteps: 10,
      sessionTimeoutSec: 600,
      requireTrustedClick: true,
      maxSensitiveActions: 3,
      maxBudgetCost: 100
    },
    permissions: {
      allowedOrigins: ['localhost', '127.0.0.1', 'file://'],
      blockedOrigins: ['evil.com', 'phishing.ru']
    }
  };

  class PolicyEngine {
    constructor(initialPolicy = DEFAULT_POLICY) {
      this.policy = JSON.parse(JSON.stringify(initialPolicy));
      this.version = POLICY_VERSION;
      this.loadPolicy();
    }

    loadPolicy() {
      if (typeof localStorage !== 'undefined') {
        try {
          const saved = localStorage.getItem('veil_user_policy');
          if (saved) {
            this.policy = { ...this.policy, ...JSON.parse(saved) };
          }
        } catch (_) {}
      }
    }

    savePolicy(newPolicy) {
      this.policy = { ...this.policy, ...newPolicy };
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('veil_user_policy', JSON.stringify(this.policy));
        } catch (_) {}
      }
    }

    getPolicy() {
      return this.policy;
    }

    /**
     * The CANONICAL Single Authority Policy Decision Point (PDP).
     * Evaluates an action across structural validity, risk classification,
     * origin permissions, capabilities, and budgets.
     *
     * @param {object} params
     * @param {object} params.action - Action object
     * @param {string} [params.origin] - Origin hostname or URL
     * @param {Element|null} [params.targetElement] - DOM element
     * @param {Set<Element>} [params.sensitiveElements] - Sensitive DOM elements
     * @param {object} [params.session] - Active session object
     * @param {object} [params.capability] - Active capability token
     * @param {object} [params.budget] - Execution budget object
     * @returns {{
     *   decision: 'ALLOW'|'DENY'|'REQUIRE_HUMAN'|'REQUIRE_REVALIDATION',
     *   riskLevel: 'SAFE'|'SENSITIVE'|'HIGH_RISK'|'BLOCKED',
     *   allowed: boolean,
     *   requiresHuman: boolean,
     *   requiresConfirmation: boolean,
     *   reason: string,
     *   policyVersion: string,
     *   requiredCapabilities: string[],
     *   error?: string
     * }}
     */
    decide(params = {}) {
      const action = params.action || {};
      const origin = params.origin || '';
      const targetElement = params.targetElement || null;
      const sensitiveElements = params.sensitiveElements || null;
      const session = params.session || null;
      const capability = params.capability || null;
      const budget = params.budget || (session && session.budget) || null;

      // 1. Validate Input Structure
      if (!action || typeof action !== 'object' || Array.isArray(action)) {
        return this._deny('invalid-action', 'Invalid or null action payload');
      }

      // 2. Reject Prototype Pollution
      if (Object.prototype.hasOwnProperty.call(action, '__proto__') ||
         (Object.prototype.hasOwnProperty.call(action, 'constructor') && typeof action.constructor !== 'function')) {
        return this._deny('prototype-pollution', 'Suspicious own-property prototype structure');
      }

      const rawType = String(action.type || action.action || '').toUpperCase().trim();

      // 3. Reject Arbitrary Code / Script Execution Primitives
      if (rawType === 'EXECUTE_JS' || rawType === 'EVAL' || rawType === 'SCRIPT' ||
          action.code !== undefined || action.script !== undefined) {
        return this._deny('arbitrary-script-forbidden', 'Arbitrary script/JavaScript execution is strictly forbidden by local authority');
      }

      // 4. Reject Raw Pixel Coordinates
      if (action.x !== undefined || action.y !== undefined || action.coordinates !== undefined) {
        return this._deny('coordinate-target-forbidden', 'Coordinate-based clicking (x/y) is forbidden; semantic element targets required');
      }

      // 5. Check Against Strict Allowlist
      if (!rawType || !ALLOWED_ACTIONS.has(rawType)) {
        return this._deny('unsupported-action', `Action type "${rawType || 'EMPTY'}" is not in the allowed execution primitives set`);
      }

      // 6. Check Origin Permissions
      if (origin && this.policy.permissions && this.policy.permissions.blockedOrigins) {
        if (this.policy.permissions.blockedOrigins.some(b => origin.includes(b))) {
          return this._deny('origin-blocked', `Origin "${origin}" is explicitly blocked by user security policy`);
        }
      }

      // 7. Check Execution Budgets (Fail-Closed)
      if (budget) {
        if (budget.currentStep !== undefined && budget.maxSteps !== undefined && budget.currentStep >= budget.maxSteps) {
          return this._deny('budget-exceeded', `Step budget exhausted (${budget.currentStep}/${budget.maxSteps})`);
        }
      }

      // 8. Safe Viewport / No-Op Actions
      if (rawType === 'WAIT' || rawType === 'NONE' || rawType === 'SCROLL' || rawType === 'FINISH') {
        return this._allow('SAFE', 'Safe viewport / no-op action');
      }

      // 9. Require Semantic Target for Targeted Actions
      if ((rawType === 'CLICK' || rawType === 'TYPE' || rawType === 'INPUT' || rawType === 'SELECT') &&
          !action.target && !targetElement) {
        return this._deny('missing-target', 'Missing semantic target: targeted action must specify a target element identifier');
      }

      // 10. Capability / ValueRef Resolution Check
      const requiredCapabilities = [];
      if (action.capabilityRequest) {
        requiredCapabilities.push(action.capabilityRequest.purpose || 'generic');
      } else if (action.valueRef) {
        requiredCapabilities.push(action.valueRef);
      }

      // 11. Hard security rule: Never allow raw plaintext typing into sensitive fields
      const isTargetSensitive = (targetElement && sensitiveElements && sensitiveElements.has(targetElement)) ||
                                (action.target && action.target.sensitive === true);
      if ((rawType === 'TYPE' || rawType === 'INPUT') && action.value !== undefined && isTargetSensitive) {
        return this._deny('plaintext-secret-forbidden', 'Strict Policy: Remote model cannot pass raw values into a sensitive/redacted field (must use capability / valueRef)');
      }

      // If authorized via Capability or ValueRef
      if ((rawType === 'TYPE' || rawType === 'INPUT') && (action.valueRef || action.capabilityRequest || capability)) {
        return this._allow('SENSITIVE', `Authorized Local Secret Injection via Capability/Vault`, requiredCapabilities);
      }

      // 12. Monetary Transfers & High-Stakes Operations
      if (rawType === 'TRANSFER' || action.amount !== undefined) {
        return this._requireHuman('Monetary transfer action requires explicit human authorization');
      }

      // Extract text/labels for semantic risk classification
      const desc = ((action.target && (action.target.description || action.target.text || action.target.name || action.target.id)) || '').toLowerCase();
      const elText = (targetElement && targetElement !== (targetElement.ownerDocument && targetElement.ownerDocument.body)
        ? (targetElement.textContent || targetElement.getAttribute('aria-label') || targetElement.getAttribute('name') || targetElement.getAttribute('id') || '')
        : '').toLowerCase();
      const combined = `${rawType.toLowerCase()} ${desc} ${elText}`;

      // 13. Policy Rules for High-Risk Actions
      if (this.policy.actions.confirmPurchases && /pay|buy|purchase|order|checkout|₹|\$|€|subscribe|card/i.test(combined)) {
        return this._requireHuman('Monetary transaction or checkout action requires explicit human confirmation');
      }

      if (this.policy.actions.confirmTransfers && /transfer|send money|wire|imps|neft|rtgs|withdraw/i.test(combined)) {
        return this._requireHuman('Financial transfer action requires explicit human authorization');
      }

      if (this.policy.actions.confirmAccountDeletion && /delete.*account|close.*account|terminate|destroy|erase all|wipe/i.test(combined)) {
        return this._requireHuman('Destructive account deletion or wipe requires explicit human confirmation');
      }

      // 14. Check HIGH_RISK Keywords
      for (const kw of HIGH_RISK_KEYWORDS) {
        if (combined.includes(kw)) {
          return this._requireHuman(`Action involves high-stakes keyword "${kw}" (monetary / irreversible operation)`);
        }
      }

      // 15. Check SENSITIVE Keywords
      for (const kw of SENSITIVE_KEYWORDS) {
        if (combined.includes(kw)) {
          return this._allow('SENSITIVE', `Action performs a state-modifying action matching "${kw}"`);
        }
      }

      // 16. Standard Safe Action
      return this._allow('SAFE', 'Action conforms to user security policy and local allowlist');
    }

    _deny(error, reason) {
      return {
        decision: 'DENY',
        riskLevel: 'BLOCKED',
        allowed: false,
        requiresHuman: false,
        requiresConfirmation: false,
        reason,
        error,
        policyVersion: this.version,
        requiredCapabilities: []
      };
    }

    _requireHuman(reason) {
      return {
        decision: 'REQUIRE_HUMAN',
        riskLevel: 'HIGH_RISK',
        allowed: false, // Cannot execute without user approval
        requiresHuman: true,
        requiresConfirmation: true,
        reason,
        policyVersion: this.version,
        requiredCapabilities: []
      };
    }

    _allow(riskLevel, reason, requiredCapabilities = []) {
      return {
        decision: 'ALLOW',
        riskLevel,
        allowed: true,
        requiresHuman: false,
        requiresConfirmation: false,
        reason,
        policyVersion: this.version,
        requiredCapabilities
      };
    }

    /**
     * Backward-compatible evaluation methods
     */
    evaluateActionPolicy(action, targetDescription = '', origin = '') {
      return this.decide({
        action: { ...action, target: { description: targetDescription } },
        origin
      });
    }

    classifyActionRisk(action, targetElement, sensitiveElements) {
      return this.decide({
        action,
        targetElement,
        sensitiveElements
      });
    }

    isPIIBlocked(piiType) {
      if (['password', 'cvv', 'pin', 'token'].includes(piiType)) return this.policy.privacy.blockCredentials;
      if (['credit_card', 'bank_account', 'pan', 'upi'].includes(piiType)) return this.policy.privacy.blockFinancial;
      if (['aadhaar', 'ssn', 'passport'].includes(piiType)) return this.policy.privacy.blockBiometric;
      return this.policy.privacy.blockPII;
    }
  }

  const defaultPolicyEngine = new PolicyEngine();

  const exportObj = {
    POLICY_VERSION,
    ALLOWED_ACTIONS,
    HIGH_RISK_KEYWORDS,
    SENSITIVE_KEYWORDS,
    DEFAULT_POLICY,
    PolicyEngine,
    defaultPolicyEngine,
    decideAction: (params) => defaultPolicyEngine.decide(params),
    classifyActionRisk: (a, t, s) => defaultPolicyEngine.classifyActionRisk(a, t, s),
    evaluateActionPolicy: (a, t, o) => defaultPolicyEngine.evaluateActionPolicy(a, t, o)
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportObj;
  }
  if (typeof window !== 'undefined') {
    window.VeilPolicyEngine = exportObj;
  }
})();
