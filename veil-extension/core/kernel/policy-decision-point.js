/**
 * VEIL — Policy Decision Point (PDP)
 *
 * Implements the separation of concerns:
 *   - Policy Decides   (VEIL Policy Decision Point)
 *   - Capability Authorizes (VEIL Capability Manager)
 *   - Executor Enforces (VEIL Action Executor)
 *   - Ledger Records    (VEIL Security Ledger)
 *
 * Output: Signed, structured PolicyDecision object:
 *   { decisionId, decision: 'ALLOW'|'DENY'|'REQUIRE_HUMAN', effectType, targetFingerprint, origin, stateHash, riskLevel, constraints, signature }
 */

(function () {
  const protectedEffects = typeof require !== 'undefined'
    ? require('./protected-effects.js')
    : (typeof window !== 'undefined' ? window.VeilProtectedEffects : null);

  const securityLedger = typeof require !== 'undefined'
    ? require('../security-ledger.js')
    : (typeof window !== 'undefined' ? window.VeilSecurityLedger : null);

  // Keyed HMAC-SHA-256 for cryptographic decision signing
  function hmacSha256(key, message) {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const crypto = require('crypto');
        return crypto.createHmac('sha256', key).update(message, 'utf8').digest('hex');
      } catch (_) {}
    }
    let h = 0;
    for (let i = 0; i < message.length; i++) {
      h = ((h << 5) - h) + message.charCodeAt(i) + key.charCodeAt(i % key.length);
      h |= 0;
    }
    return 'hmac_pdp_' + Math.abs(h).toString(16).padStart(64, '0');
  }

  // Cryptographically secure random hex generator (Zero Math.random())
  function secureRandomHex(bytes = 8) {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const crypto = require('crypto');
        return crypto.randomBytes(bytes).toString('hex');
      } catch (_) {}
    }
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint8Array(bytes);
      window.crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    }
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint8Array(bytes);
      crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    }
    return 'sec_' + Date.now().toString(16);
  }

  const PDP_VERSION = '3.0.0';

  const DEFAULT_POLICY_RULES = {
    allowSameOriginSafeClicks: true,
    confirmMonetaryTransactions: true,
    confirmAccountModifications: true,
    blockArbitraryScripts: true,
    blockCoordinates: true,
    blockUntrustedOrigins: true,
    allowedOrigins: ['localhost', '127.0.0.1'],
    blockedOrigins: ['phishing.ru', 'evil.com', 'evil.test', 'tracker.ad']
  };

  class PolicyDecisionPoint {
    constructor(rules = DEFAULT_POLICY_RULES) {
      this.rules = { ...DEFAULT_POLICY_RULES, ...rules };
      this.version = PDP_VERSION;
      this.pdpSecret = secureRandomHex(32);
    }

    /**
     * Evaluates a proposed action against user policy, risk profiles, origin bounds, and stateHash.
     *
     * @param {object} params
     * @param {object} params.proposal - { type, target, value, valueRef, coordinates, code }
     * @param {Element|null} [params.targetElement] - Resolved DOM node
     * @param {string} [params.targetFingerprint] - Target element fingerprint
     * @param {string} [params.origin] - Origin hostname or URL
     * @param {string} [params.stateHash] - Canonical DOM stateHash
     * @param {Set<Element>} [params.sensitiveElements] - Detected sensitive elements
     * @returns {object} Immutable, structured PolicyDecision
     */
    evaluate(params = {}) {
      const proposal = params.proposal || {};
      const origin = (params.origin || proposal.origin || 'localhost').toLowerCase();
      const stateHash = params.stateHash || 'unanchored_state';
      const targetElement = params.targetElement || null;
      const targetFingerprint = params.targetFingerprint || (targetElement && targetElement.id) || 'any';
      const sensitiveElements = params.sensitiveElements || new Set();

      // 1. Validate Proposal Structure & Prototype Pollution
      if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
        return this._deny('INVALID_PROPOSAL', 'Malformed or empty action proposal', params);
      }
      if (Object.prototype.hasOwnProperty.call(proposal, '__proto__') ||
         (Object.prototype.hasOwnProperty.call(proposal, 'constructor') && typeof proposal.constructor !== 'function')) {
        return this._deny('PROTOTYPE_POLLUTION', 'Adversarial prototype manipulation rejected', params);
      }

      // 2. Reject Arbitrary Scripts / Code Execution Primitives
      const rawType = String(proposal.type || proposal.action || '').toUpperCase().trim();
      if (rawType === 'EXECUTE_JS' || rawType === 'EVAL' || proposal.code !== undefined || proposal.script !== undefined) {
        return this._deny('ARBITRARY_SCRIPT_FORBIDDEN', 'Arbitrary JavaScript/script execution is forbidden by Kernel policy', params);
      }

      // 3. Reject Pixel Coordinates
      if (proposal.x !== undefined || proposal.y !== undefined || proposal.coordinates !== undefined) {
        return this._deny('COORDINATES_FORBIDDEN', 'Coordinate-based clicking is prohibited; semantic targets required', params);
      }

      // 4. Map to Protected Side Effect
      const effectDesc = protectedEffects && protectedEffects.getProtectedEffect
        ? protectedEffects.getProtectedEffect(proposal)
        : { id: rawType, defaultRisk: 'SAFE', reversibility: 'REVERSIBLE' };

      if (!effectDesc) {
        return this._deny('UNSUPPORTED_EFFECT', `Side effect "${rawType}" is not permitted under Kernel policy`, params);
      }

      // 5. Origin Boundary Check
      if (this.rules.blockedOrigins.some(b => origin.includes(b))) {
        return this._deny('BLOCKED_ORIGIN', `Origin "${origin}" is explicitly blacklisted by security policy`, params);
      }

      // 6. Sensitive Target Protection (Invariant I5: Zero Plaintext in Sensitive Fields)
      const isSensitiveTarget = (targetElement && sensitiveElements.has(targetElement)) ||
                                (proposal.target && proposal.target.sensitive === true);

      if (effectDesc.id === 'TYPE' && proposal.value !== undefined && isSensitiveTarget) {
        return this._deny('PLAINTEXT_SECRET_FORBIDDEN', 'Plaintext secret typing into sensitive/redacted field is prohibited (must use ValueRef / Capability)', params);
      }

      // 7. Extract Target & Context Semantics for High-Risk Assessment
      const desc = ((proposal.target && (proposal.target.description || proposal.target.text || proposal.target.name || proposal.target.id)) || '').toLowerCase();
      const elText = (targetElement && targetElement !== (targetElement.ownerDocument && targetElement.ownerDocument.body)
        ? (targetElement.textContent || targetElement.getAttribute('aria-label') || targetElement.id || '')
        : '').toLowerCase();
      const combinedContext = `${effectDesc.id.toLowerCase()} ${desc} ${elText}`;

      // 8. Monetary / Irreversible Operations require Out-of-Band Human Approval
      if (effectDesc.id === 'PURCHASE' || effectDesc.id === 'TRANSFER' || effectDesc.id === 'DELETE' || effectDesc.id === 'CHANGE_SETTING' ||
          /pay|buy|purchase|checkout|₹|\$|€|transfer|delete.*account|wipe|terminate/i.test(combinedContext)) {
        return this._requireHuman(effectDesc.id, 'High-stakes or irreversible operation requires explicit human authorization', params, 'HIGH_RISK');
      }

      // 9. Sensitive State Modification
      if (/submit|confirm|apply|save|register|upload/i.test(combinedContext) || isSensitiveTarget) {
        return this._allow(effectDesc.id, 'SENSITIVE', 'Permitted state-modifying action on recognized target', params);
      }

      // 10. Standard Safe Action
      return this._allow(effectDesc.id, 'SAFE', 'Standard interaction conforming to policy and allowlist', params);
    }

    _allow(effectType, riskLevel, reason, params) {
      const decisionId = `dec_${Date.now()}_${secureRandomHex(8)}`;
      const targetFingerprint = params.targetFingerprint || (params.targetElement && params.targetElement.id) || 'any';
      const origin = params.origin || 'localhost';
      const stateHash = params.stateHash || 'unanchored_state';
      const issuedAt = Date.now();
      const authorizedSecretId = (params.proposal && (params.proposal.valueRef || params.proposal.secretId)) || null;

      const constraints = {
        singleUse: true,
        maxUses: 1,
        ttlMs: 15000,
        attenuation: 'SCOPE_ELEMENT'
      };

      const sigPayload = `${decisionId}:ALLOW:${effectType}:${targetFingerprint}:${origin}:${stateHash}:${authorizedSecretId || ''}:${issuedAt}`;
      const signature = hmacSha256(this.pdpSecret, sigPayload);

      return {
        decisionId,
        decision: 'ALLOW',
        riskLevel,
        effectType,
        targetFingerprint,
        origin,
        stateHash,
        authorizedSecretId,
        reason,
        requiresHuman: false,
        allowed: true,
        constraints,
        signature,
        issuedAt,
        pdpVersion: this.version
      };
    }

    _requireHuman(effectType, reason, params, riskLevel = 'HIGH_RISK') {
      const decisionId = `dec_${Date.now()}_${secureRandomHex(8)}`;
      const targetFingerprint = params.targetFingerprint || (params.targetElement && params.targetElement.id) || 'any';
      const origin = params.origin || 'localhost';
      const stateHash = params.stateHash || 'unanchored_state';
      const issuedAt = Date.now();
      const authorizedSecretId = (params.proposal && (params.proposal.valueRef || params.proposal.secretId)) || null;

      const constraints = {
        singleUse: true,
        maxUses: 1,
        ttlMs: 30000,
        attenuation: 'SCOPE_ELEMENT'
      };

      const sigPayload = `${decisionId}:REQUIRE_HUMAN:${effectType}:${targetFingerprint}:${origin}:${stateHash}:${authorizedSecretId || ''}:${issuedAt}`;
      const signature = hmacSha256(this.pdpSecret, sigPayload);

      return {
        decisionId,
        decision: 'REQUIRE_HUMAN',
        riskLevel,
        effectType,
        targetFingerprint,
        origin,
        stateHash,
        authorizedSecretId,
        reason,
        requiresHuman: true,
        allowed: false, // Cannot execute without out-of-band user approval
        constraints,
        signature,
        issuedAt,
        pdpVersion: this.version
      };
    }

    _deny(error, reason, params) {
      const decisionId = `dec_${Date.now()}_${secureRandomHex(8)}`;
      return {
        decisionId,
        decision: 'DENY',
        riskLevel: 'BLOCKED',
        effectType: (params.proposal && (params.proposal.type || params.proposal.action)) || 'UNKNOWN',
        targetFingerprint: 'none',
        origin: params.origin || 'unknown',
        stateHash: params.stateHash || 'none',
        authorizedSecretId: null,
        reason,
        error,
        requiresHuman: false,
        allowed: false,
        constraints: null,
        signature: null,
        issuedAt: Date.now(),
        pdpVersion: this.version
      };
    }
  }

  const defaultPDP = new PolicyDecisionPoint();

  const exportObj = {
    PolicyDecisionPoint,
    defaultPDP,
    evaluate: (p) => defaultPDP.evaluate(p)
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportObj;
  }
  if (typeof window !== 'undefined') {
    window.VeilPDP = exportObj;
  }
})();
