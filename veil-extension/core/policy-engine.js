/**
 * VEIL — User-Controlled Policy Engine
 *
 * Provides granular, user-configurable security rules governing what AI agents
 * are permitted to observe, reason about, and execute.
 */

(function () {
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
      maxSteps: 5,
      sessionTimeoutSec: 600,
      requireTrustedClick: true
    },
    permissions: {
      allowedOrigins: ['localhost', '127.0.0.1', 'file://'],
      blockedOrigins: ['evil.com', 'phishing.ru']
    }
  };

  class PolicyEngine {
    constructor(initialPolicy = DEFAULT_POLICY) {
      this.policy = JSON.parse(JSON.stringify(initialPolicy));
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
     * Evaluates whether an action is allowed, requires confirmation, or is blocked.
     * @param {object} action - Action descriptor
     * @param {string} targetDescription - Target element text/label
     * @param {string} origin - Origin hostname
     * @returns {{ allowed: boolean, requiresConfirmation: boolean, level: string, reason: string }}
     */
    evaluateActionPolicy(action, targetDescription = '', origin = '') {
      const descLower = (targetDescription || '').toLowerCase();
      const actionType = (action.action || action.type || '').toLowerCase();

      // Check origin permissions
      if (this.policy.permissions.blockedOrigins.some(b => origin.includes(b))) {
        return {
          allowed: false,
          requiresConfirmation: false,
          level: 'BLOCKED',
          reason: `Origin "${origin}" is explicitly blocked by user security policy.`
        };
      }

      // Check Purchases
      if (this.policy.actions.confirmPurchases) {
        if (/pay|buy|purchase|order|checkout|₹|\$|€|subscribe|card/i.test(descLower)) {
          return {
            allowed: true,
            requiresConfirmation: true,
            level: 'HIGH_RISK',
            reason: 'Monetary transaction or checkout action requires explicit human confirmation.'
          };
        }
      }

      // Check Transfers / Money
      if (this.policy.actions.confirmTransfers) {
        if (/transfer|send money|wire|imps|neft|rtgs|withdraw/i.test(descLower)) {
          return {
            allowed: true,
            requiresConfirmation: true,
            level: 'HIGH_RISK',
            reason: 'Financial transfer action requires explicit human authorization.'
          };
        }
      }

      // Check Account Deletion
      if (this.policy.actions.confirmAccountDeletion) {
        if (/delete account|close account|terminate|destroy|erase all/i.test(descLower)) {
          return {
            allowed: true,
            requiresConfirmation: true,
            level: 'HIGH_RISK',
            reason: 'Destructive account deletion requires explicit human confirmation.'
          };
        }
      }

      // Default Safe Action
      return {
        allowed: true,
        requiresConfirmation: false,
        level: 'SAFE',
        reason: 'Action conforms to user security policy.'
      };
    }

    /**
     * Checks if a PII type is blocked from transmission.
     * @param {string} piiType
     * @returns {boolean}
     */
    isPIIBlocked(piiType) {
      if (['password', 'cvv', 'pin', 'token'].includes(piiType)) return this.policy.privacy.blockCredentials;
      if (['credit_card', 'bank_account', 'pan', 'upi'].includes(piiType)) return this.policy.privacy.blockFinancial;
      if (['aadhaar', 'ssn', 'passport'].includes(piiType)) return this.policy.privacy.blockBiometric;
      return this.policy.privacy.blockPII;
    }
  }

  const defaultPolicyEngine = new PolicyEngine();

  const exportObj = {
    DEFAULT_POLICY,
    PolicyEngine,
    defaultPolicyEngine
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportObj;
  }
  if (typeof window !== 'undefined') {
    window.VeilPolicyEngine = exportObj;
  }
})();
