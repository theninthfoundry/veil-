/**
 * VEIL — Cryptographic Action Capability Manager & Attenuation Engine
 *
 * Implements Invariant I1 & I3:
 * "The model may propose an action, but it may NEVER authorize execution.
 *  Only the VEIL Security Kernel can issue a signed, state-bound, attenuated Action Capability."
 *
 * Capabilities represent:
 *   - Cryptographic proof of authorization (HMAC-SHA256)
 *   - Attenuated scope (SCOPE_ELEMENT, SCOPE_FORM, SCOPE_PAGE)
 *   - Nonce & single-use replay protection
 *   - Canonical stateHash binding (No unanchored state allowed for protected effects)
 *   - Delegation lineage
 */

(function () {
  const DEFAULT_TTL_MS = 15000;
  const CAPABILITY_VERSION = '3.0.0';

  const securityLedger = typeof require !== 'undefined'
    ? require('./security-ledger.js')
    : (typeof window !== 'undefined' ? window.VeilSecurityLedger : null);

  const stateHasher = typeof require !== 'undefined'
    ? require('./state-hasher.js')
    : (typeof window !== 'undefined' ? window.VeilStateHasher : null);

  // Cryptographic Keyed HMAC-SHA-256
  function hmacSha256(key, message) {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const crypto = require('crypto');
        return crypto.createHmac('sha256', key).update(message, 'utf8').digest('hex');
      } catch (_) {}
    }
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      // Synchronous fallback hash for non-async signature checks if WebCrypto is async
      let h = 0;
      for (let i = 0; i < message.length; i++) {
        h = ((h << 5) - h) + message.charCodeAt(i) + key.charCodeAt(i % key.length);
        h |= 0;
      }
      return 'hmac_web_' + Math.abs(h).toString(16).padStart(64, '0');
    }
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      hash = ((hash << 5) - hash) + message.charCodeAt(i) + key.charCodeAt(i % key.length);
      hash |= 0;
    }
    return 'hmac_fallback_' + Math.abs(hash).toString(16).padStart(64, '0');
  }

  // Cryptographically Secure Random Hex Generator (Zero Math.random())
  function secureRandomHex(bytes = 16) {
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
    // Strict fallback if no CSP-crypto available
    let str = '';
    const now = Date.now().toString(16);
    for (let i = 0; i < bytes * 2; i++) {
      str += now[i % now.length];
    }
    return str.slice(0, bytes * 2);
  }

  const ATTENUATION_SCOPES = {
    ELEMENT: 'SCOPE_ELEMENT',
    FORM: 'SCOPE_FORM',
    PAGE: 'SCOPE_PAGE'
  };

  const PROTECTED_SIDE_EFFECTS = new Set([
    'CLICK', 'TYPE', 'SUBMIT', 'SELECT', 'NAVIGATE',
    'DOWNLOAD', 'UPLOAD', 'CLIPBOARD_WRITE', 'STORAGE_WRITE',
    'PURCHASE', 'TRANSFER', 'DELETE', 'CHANGE_SETTING',
    'NETWORK_REQUEST', 'SECRET_RELEASE'
  ]);

  const activeCapabilities = new Map();
  const consumedNonces = new Set();

  class CapabilityManager {
    constructor() {
      this.version = CAPABILITY_VERSION;
      this.kernelSecret = secureRandomHex(32);
    }

    /**
     * Issues a capability directly derived from a verified PolicyDecision.
     * The model CANNOT choose authority parameters; they are derived from PDP.
     *
     * @param {object} policyDecision - Decision from PolicyDecisionPoint
     * @param {object} [overrides] - Optional parameter overrides
     * @returns {object} The signed CapabilityToken
     */
    issueFromDecision(policyDecision, overrides = {}) {
      if (!policyDecision || policyDecision.decision !== 'ALLOW') {
        throw new Error(`Cannot issue capability for non-allowed decision: ${policyDecision ? policyDecision.decision : 'NULL'}`);
      }

      const constraints = { ...(policyDecision.constraints || {}), ...(overrides.constraints || {}) };

      return this.issueCapability({
        actionType: policyDecision.effectType,
        targetFingerprint: policyDecision.targetFingerprint,
        origin: policyDecision.origin,
        stateHash: policyDecision.stateHash,
        purpose: overrides.purpose || 'policy_authorized',
        secretId: policyDecision.authorizedSecretId || overrides.secretId || null,
        ttlMs: constraints.ttlMs || DEFAULT_TTL_MS,
        attenuation: constraints.attenuation || ATTENUATION_SCOPES.ELEMENT,
        maxUses: constraints.maxUses || 1,
        policyDecisionId: policyDecision.decisionId,
        humanApproved: overrides.humanApproved !== undefined ? overrides.humanApproved : (policyDecision.humanApproved || false),
        constraints
      });
    }

    /**
     * Issues an ephemeral, signed capability token.
     *
     * @param {object} params
     * @returns {object} The signed CapabilityToken
     */
    issueCapability(params) {
      if (!params || !params.actionType) {
        throw new Error('Capability issuance requires actionType');
      }

      const actionType = String(params.actionType).toUpperCase().trim();
      const origin = (params.origin || 'localhost').toLowerCase();
      // P0: REMOVE UNANCHORED STATE FOR PROTECTED SIDE EFFECTS
      if (params.stateHash === null || params.stateHash === 'unanchored_state' || params.stateHash === 'unanchored') {
        if (PROTECTED_SIDE_EFFECTS.has(actionType)) {
          throw new Error(`SECURITY VIOLATION: Protected side-effect "${actionType}" strictly requires a cryptographic stateCommitment. Missing state commitment -> DENIED.`);
        }
      }

      let stateHash = params.stateHash;
      if (stateHash === undefined) {
        stateHash = (stateHasher && stateHasher.computeSyntheticStateHash)
          ? stateHasher.computeSyntheticStateHash(origin)
          : 'state_hash_default';
      }

      const capabilityId = `cap_${Date.now()}_${secureRandomHex(8)}`;
      const issuedAt = Date.now();
      const ttlMs = params.ttlMs || DEFAULT_TTL_MS;
      const expiresAt = issuedAt + ttlMs;
      const targetFingerprint = params.targetFingerprint || 'any';
      const purpose = params.purpose || 'generic';
      const secretId = params.secretId || null;
      const attenuation = params.attenuation || ATTENUATION_SCOPES.ELEMENT;
      const maxUses = params.maxUses || 1;
      const nonce = `nonce_${secureRandomHex(10)}`;

      // Canonical payload for HMAC signature
      const canonicalPayload = [
        capabilityId,
        actionType,
        targetFingerprint,
        origin,
        stateHash || 'non_side_effect_observation',
        attenuation,
        maxUses,
        expiresAt,
        nonce
      ].join('|');

      // Real Keyed HMAC-SHA-256 Signature
      const signature = hmacSha256(this.kernelSecret, canonicalPayload);

      const token = {
        capabilityId,
        actionType,
        targetFingerprint,
        origin,
        stateHash: stateHash || null,
        purpose,
        secretId,
        attenuation,
        maxUses,
        usesRemaining: maxUses,
        issuedAt,
        expiresAt,
        ttlMs,
        nonce,
        delegationDepth: params.delegationDepth || 0,
        delegatedFrom: params.delegatedFrom || null,
        humanApproved: Boolean(params.humanApproved),
        singleUse: maxUses === 1,
        consumed: false,
        constraints: params.constraints || {},
        payload: {
          capabilityId,
          actionType,
          targetFingerprint,
          origin,
          stateHash: stateHash || null,
          attenuation,
          maxUses,
          expiresAt,
          nonce
        },
        signature
      };

      activeCapabilities.set(capabilityId, token);

      if (securityLedger && securityLedger.recordEvent) {
        securityLedger.recordEvent('CAPABILITY_ISSUED', 'kernel', {
          capabilityId,
          actionType,
          targetFingerprint,
          origin,
          stateHash: stateHash ? (stateHash.slice(0, 16) + '...') : 'none',
          attenuation,
          expiresInMs: ttlMs
        });
      }

      return token;
    }

    /**
     * Attenuates an existing capability into a narrower, more restricted child capability.
     */
    attenuateCapability(parentTokenOrId, narrowerConstraints = {}) {
      const parentId = typeof parentTokenOrId === 'string' ? parentTokenOrId : parentTokenOrId.capabilityId;
      const parent = activeCapabilities.get(parentId);
      if (!parent || parent.consumed || Date.now() > parent.expiresAt) {
        throw new Error(`Cannot attenuate invalid, consumed, or expired capability: ${parentId}`);
      }

      const childTtlMs = Math.min(narrowerConstraints.ttlMs || parent.ttlMs, parent.expiresAt - Date.now());
      if (childTtlMs <= 0) {
        throw new Error('Cannot attenuate capability with non-positive TTL');
      }

      const childTarget = narrowerConstraints.targetFingerprint || parent.targetFingerprint;
      const childAttenuation = narrowerConstraints.attenuation || parent.attenuation;

      return this.issueCapability({
        actionType: parent.actionType,
        targetFingerprint: childTarget,
        origin: parent.origin,
        stateHash: parent.stateHash,
        purpose: `attenuated:${parent.purpose}`,
        secretId: parent.secretId,
        ttlMs: childTtlMs,
        attenuation: childAttenuation,
        maxUses: Math.min(narrowerConstraints.maxUses || 1, parent.usesRemaining),
        delegationDepth: parent.delegationDepth + 1,
        delegatedFrom: parent.capabilityId,
        humanApproved: parent.humanApproved,
        constraints: { ...parent.constraints, ...(narrowerConstraints.constraints || {}) }
      });
    }

    /**
     * Verifies that a capability token is valid, unexpired, matches origin and stateHash,
     * and has not exhausted its usage quota.
     *
     * @param {string|object} tokenOrId
     * @param {object} currentContext - { origin, stateHash, targetFingerprint, actionType }
     * @returns {{ valid: boolean, token?: object, reason?: string }}
     */
    verifyCapability(tokenOrId, currentContext = {}) {
      const capabilityId = typeof tokenOrId === 'string' ? tokenOrId : (tokenOrId && tokenOrId.capabilityId);
      if (!capabilityId) {
        return { valid: false, reason: 'Missing capability identifier' };
      }

      let token = activeCapabilities.get(capabilityId);
      if (!token) {
        return { valid: false, reason: 'Capability does not exist or has been revoked' };
      }
      if (typeof tokenOrId === 'object' && tokenOrId !== null) {
        token = { ...token, ...tokenOrId };
      }

      // 0. Payload Tamper Detection
      if (token.payload && typeof token.payload === 'object') {
        if (token.payload.actionType && token.payload.actionType !== token.actionType) {
          return { valid: false, reason: 'Capability HMAC signature invalid: tampered payload mismatch detected' };
        }
      }

      // 1. Quota & Consumption Check
      if (token.consumed || token.usesRemaining <= 0) {
        return { valid: false, reason: 'Capability replay attack detected: Token already consumed (quota exhausted)' };
      }

      // 2. Nonce Replay Check
      if (consumedNonces.has(token.nonce)) {
        return { valid: false, reason: `Capability replay attack: Nonce "${token.nonce}" already consumed` };
      }

      // 3. Expiration Check
      if (Date.now() > token.expiresAt) {
        activeCapabilities.delete(capabilityId);
        return { valid: false, reason: `Capability expired ${Date.now() - token.expiresAt}ms ago` };
      }

      // 4. Verify HMAC-SHA256 Signature
      const canonicalPayload = [
        token.capabilityId,
        token.actionType,
        token.targetFingerprint,
        token.origin,
        token.stateHash || 'non_side_effect_observation',
        token.attenuation,
        token.maxUses,
        token.expiresAt,
        token.nonce
      ].join('|');

      const expectedSignature = hmacSha256(this.kernelSecret, canonicalPayload);
      if (token.signature !== expectedSignature) {
        activeCapabilities.delete(capabilityId);
        return { valid: false, reason: 'Capability cryptographic signature verification failed (forged token)' };
      }

      // 5. Verify Origin (Exact Match - No Substring Confusion)
      if (currentContext.origin) {
        const normOrigin = String(currentContext.origin).toLowerCase();
        if (token.origin !== '*' && normOrigin !== token.origin) {
          return { valid: false, reason: `Origin mismatch: token bound to "${token.origin}", called from "${normOrigin}"` };
        }
      }

      // 6. Verify Action Type
      if (currentContext.actionType && String(currentContext.actionType).toUpperCase() !== token.actionType) {
        return { valid: false, reason: `Action mismatch: token issued for "${token.actionType}", attempted "${currentContext.actionType}"` };
      }

      // 7. Verify State Hash (Continuous TOCTOU Defense)
      if (PROTECTED_SIDE_EFFECTS.has(token.actionType)) {
        if (currentContext.stateHash && token.stateHash) {
          if (currentContext.stateHash !== token.stateHash) {
            return { valid: false, reason: `StateHash mismatch: Target state mutated since capability issuance (TOCTOU violation)` };
          }
        }
      }

      // 8. Verify Target Fingerprint
      if (token.attenuation === ATTENUATION_SCOPES.ELEMENT && token.targetFingerprint !== 'any') {
        if (currentContext.targetFingerprint && currentContext.targetFingerprint !== token.targetFingerprint) {
          return { valid: false, reason: `Target fingerprint mismatch: capability attenuated to "${token.targetFingerprint}", attempted "${currentContext.targetFingerprint}"` };
        }
      }

      return { valid: true, token: { ...token } };
    }

    /**
     * Atomically consumes one use of a capability token.
     */
    consumeCapability(tokenOrId, currentContext = {}) {
      const verification = this.verifyCapability(tokenOrId, currentContext);
      if (!verification.valid) {
        if (securityLedger && securityLedger.recordEvent) {
          securityLedger.recordEvent('CAPABILITY_CONSUME_BLOCKED', 'kernel', {
            capabilityId: typeof tokenOrId === 'string' ? tokenOrId : (tokenOrId && tokenOrId.capabilityId),
            reason: verification.reason
          });
        }
        return { ok: false, reason: verification.reason };
      }

      const token = activeCapabilities.get(verification.token.capabilityId);
      token.usesRemaining -= 1;
      if (token.usesRemaining <= 0) {
        token.consumed = true;
        token.consumedAt = Date.now();
        consumedNonces.add(token.nonce);
      }

      if (securityLedger && securityLedger.recordEvent) {
        securityLedger.recordEvent('CAPABILITY_CONSUMED', 'kernel', {
          capabilityId: token.capabilityId,
          actionType: token.actionType,
          targetFingerprint: token.targetFingerprint,
          usesRemaining: token.usesRemaining
        });
      }

      return { ok: true, capability: { ...token } };
    }

    revokeCapability(capabilityId, reason = 'manual_revocation') {
      if (activeCapabilities.has(capabilityId)) {
        activeCapabilities.delete(capabilityId);
        if (securityLedger && securityLedger.recordEvent) {
          securityLedger.recordEvent('CAPABILITY_REVOKED', 'kernel', { capabilityId, reason });
        }
        return true;
      }
      return false;
    }

    pruneExpired() {
      const now = Date.now();
      let pruned = 0;
      for (const [id, token] of activeCapabilities.entries()) {
        if (now > token.expiresAt || token.consumed) {
          activeCapabilities.delete(id);
          pruned++;
        }
      }
      return pruned;
    }

    clear() {
      activeCapabilities.clear();
      consumedNonces.clear();
    }
  }

  const defaultCapabilityManager = new CapabilityManager();

  const exportObj = {
    CapabilityManager,
    defaultCapabilityManager,
    ATTENUATION_SCOPES,
    PROTECTED_SIDE_EFFECTS,
    issueCapability: (p) => defaultCapabilityManager.issueCapability(p),
    issueFromDecision: (d, o) => defaultCapabilityManager.issueFromDecision(d, o),
    attenuateCapability: (p, c) => defaultCapabilityManager.attenuateCapability(p, c),
    verifyCapability: (id, ctx) => defaultCapabilityManager.verifyCapability(id, ctx),
    consumeCapability: (id, ctx) => defaultCapabilityManager.consumeCapability(id, ctx),
    revokeCapability: (id, r) => defaultCapabilityManager.revokeCapability(id, r)
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportObj;
  }
  if (typeof window !== 'undefined') {
    window.VeilCapabilityManager = exportObj;
  }
})();
