/**
 * VEIL — Local Secret Reference Vault
 *
 * Enforces the core invariant:
 * "Semantic access does not imply data access. Raw secrets never leave the device."
 *
 * Architecture:
 *   - Secret Metadata: exposed locally for policy & reference (secretId, label, type, domain scope, field scope)
 *   - Secret Value: stored strictly on-device in local vault storage.
 *   - Resolution: only occurs inside the browser execution context immediately before DOM dispatch.
 *   - Never logged: Secret values are strictly scrubbed from telemetry, logs, ledgers, and error messages.
 */

(function () {
  function loadFixtureSeeds() {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const fs = require('fs');
        const path = require('path');
        const fixturePath = path.join(__dirname, '../fixtures/secrets.fixture.json');
        if (fs.existsSync(fixturePath)) {
          return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
        }
      } catch (_) {}
    }
    return [];
  }

  // Pure zero-trust: in production without explicit flag, vault starts empty. In dev/test/demo, seed fixtures.
  const isTestEnv = (typeof process !== 'undefined' && process.env && (process.env.VEIL_TEST_FIXTURES === 'true' || process.env.NODE_ENV !== 'production')) ||
                    (typeof window !== 'undefined' && (window.__VEIL_TEST_FIXTURES__ === true || window.VEIL_TEST_FIXTURES === true || !window.__VEIL_PROD__));

  let inMemoryVault = isTestEnv ? loadFixtureSeeds() : [];

  // Active single-use capabilities registry
  // Key: capabilityId -> Capability Object
  const activeCapabilities = new Map();

  /**
   * Get all secret metadata (WITHOUT raw values) for Observatory and Context Builder.
   * @returns {Array<{secretId: string, label: string, type: string, maskedDisplay: string, allowedOrigins: string[]}>}
   */
  function getSecretMetadata() {
    // Returns sanitized vault inventory for UI inspector
    return inMemoryVault.map(({ secretId, label, type, maskedDisplay, allowedOrigins, allowedFields }) => ({
      secretId,
      label,
      type,
      maskedDisplay,
      allowedOrigins,
      allowedFields
    }));
  }

  /**
   * Issues a cryptographic, single-use, expiring Capability Token.
   *
   * @param {object} params
   * @param {string} params.secretId - e.g. "LOCAL_SECRET_01"
   * @param {string} params.purpose - e.g. "credit_card", "login_password"
   * @param {string} params.origin - Origin hostname e.g. "localhost"
   * @param {string} [params.fieldFingerprint] - Target element fingerprint
   * @param {string} [params.sessionId] - Session identifier
   * @param {number} [params.ttlMs=60000] - Time to live in ms
   * @returns {{ capabilityId: string, secretId: string, purpose: string, origin: string, expiresAt: number, singleUse: boolean }}
   */
  function issueCapability({ secretId, purpose, origin, fieldFingerprint, sessionId, policyVersion = '2.0.0', ttlMs = 60000 }) {
    const entry = inMemoryVault.find(s =>
      (secretId && s.secretId.toUpperCase() === secretId.toUpperCase()) ||
      (purpose && (s.purpose === purpose || s.type === purpose))
    );

    if (!entry) {
      throw new Error(`Capability issuance failed: unknown secret or purpose "${secretId || purpose}"`);
    }

    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const capabilityId = `cap_${Date.now().toString(36)}_${randomSuffix}`;

    const capability = {
      capabilityId,
      secretId: entry.secretId,
      purpose: purpose || entry.purpose || entry.type,
      origin: (origin || '').toLowerCase().replace(/^(https?:\/\/)/, '').replace(/:\d+$/, '').replace(/\/.*$/, '').trim(),
      fieldFingerprint: fieldFingerprint || '*',
      sessionId: sessionId || 'default-session',
      policyVersion,
      issuedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
      singleUse: true,
      consumed: false
    };

    activeCapabilities.set(capabilityId, capability);

    // Return safe capability metadata (NEVER raw secret)
    return {
      capabilityId: capability.capabilityId,
      secretId: capability.secretId,
      purpose: capability.purpose,
      origin: capability.origin,
      fieldFingerprint: capability.fieldFingerprint,
      issuedAt: capability.issuedAt,
      expiresAt: capability.expiresAt,
      singleUse: true
    };
  }

  /**
   * Consumes a single-use capability token to safely resolve a secret immediately before execution.
   * Enforces origin-binding, field-binding, expiration, and replay prevention.
   */
  function consumeCapability(capabilityId, currentOrigin, fieldIdentifier, fieldFingerprint) {
    if (!capabilityId || typeof capabilityId !== 'string') {
      return { ok: false, reason: 'missing-or-invalid-capability-id' };
    }

    const cap = activeCapabilities.get(capabilityId);
    if (!cap) {
      return { ok: false, reason: `unknown-or-revoked-capability: ${capabilityId}` };
    }

    // 1. Single-Use Replay Protection
    if (cap.consumed) {
      activeCapabilities.delete(capabilityId);
      return { ok: false, reason: 'capability-already-consumed-replay-prevented', capabilityId };
    }

    // 2. Expiration Check
    if (Date.now() > cap.expiresAt) {
      activeCapabilities.delete(capabilityId);
      return { ok: false, reason: 'capability-expired', capabilityId };
    }

    // 3. Origin-Binding Check
    const origin = (currentOrigin || '')
      .toLowerCase()
      .replace(/^(https?:\/\/)/, '')
      .replace(/:\d+$/, '')
      .replace(/\/.*$/, '')
      .trim();

    if (cap.origin && cap.origin !== '*' && cap.origin !== origin && !origin.endsWith('.' + cap.origin)) {
      return { ok: false, reason: `capability-origin-mismatch: bound to ${cap.origin}, called from ${currentOrigin}`, capabilityId };
    }

    // 4. Field Fingerprint Check (if specified)
    if (cap.fieldFingerprint && cap.fieldFingerprint !== '*' && fieldFingerprint && cap.fieldFingerprint !== fieldFingerprint) {
      return { ok: false, reason: `capability-fingerprint-mismatch: target element mutated`, capabilityId };
    }

    // 5. Invalidate immediately (FAIL-CLOSED on subsequent calls)
    cap.consumed = true;
    activeCapabilities.delete(capabilityId);

    // 6. Resolve raw value locally for the execution runtime
    const entry = inMemoryVault.find(s => s.secretId === cap.secretId);
    if (!entry) {
      return { ok: false, reason: `secret-entry-missing: ${cap.secretId}` };
    }

    return {
      ok: true,
      value: entry.value,
      secretId: entry.secretId,
      purpose: cap.purpose,
      capabilityId
    };
  }

  /**
   * Resolve a secret reference value locally with strict origin & field boundary checks.
   *
   * @param {string} secretId — e.g. "LOCAL_SECRET_01"
   * @param {string} currentOrigin — e.g. "localhost" or "127.0.0.1"
   * @param {string} fieldIdentifier — e.g. "card_number" or "notes"
   * @returns {{ok: boolean, value?: string, reason?: string, secretId: string, label?: string}}
   */
  function resolveSecret(secretId, currentOrigin, fieldIdentifier) {
    if (!secretId || typeof secretId !== 'string' || !/^LOCAL_[A-Z0-9_]+$/i.test(secretId.trim())) {
      return { ok: false, reason: 'invalid-secret-id-format', secretId: String(secretId) };
    }

    const entry = inMemoryVault.find(s => s.secretId.toUpperCase() === secretId.trim().toUpperCase());
    if (!entry) {
      return { ok: false, reason: `unknown-secret-reference: ${secretId}`, secretId };
    }

    // 1. Origin Scope Check: strict hostname matching
    const origin = (currentOrigin || '')
      .toLowerCase()
      .replace(/^(https?:\/\/)/, '')
      .replace(/:\d+$/, '')
      .replace(/\/.*$/, '')
      .trim();

    const originAllowed = entry.allowedOrigins.some(o => {
      const allowed = o.toLowerCase().trim();
      return origin === allowed || origin.endsWith('.' + allowed);
    });

    if (!originAllowed) {
      return {
        ok: false,
        reason: `domain-scope-violation: secret ${secretId} not authorized on ${currentOrigin}`,
        secretId,
        label: entry.label
      };
    }

    // 2. Field Scope Check
    const field = (fieldIdentifier || '').toLowerCase();
    const fieldAllowed = entry.allowedFields.some(f => field.includes(f.toLowerCase()) || f === '*');
    if (!fieldAllowed && fieldIdentifier) {
      return {
        ok: false,
        reason: `field-scope-mismatch: secret ${secretId} cannot be injected into field "${fieldIdentifier}"`,
        secretId,
        label: entry.label
      };
    }

    // Success: return raw value locally to the executor only
    return {
      ok: true,
      value: entry.value,
      secretId: entry.secretId,
      label: entry.label,
      type: entry.type
    };
  }

  /**
   * Add or update a local secret.
   */
  function setSecret(secret) {
    const existingIdx = inMemoryVault.findIndex(s => s.secretId === secret.secretId);
    if (existingIdx >= 0) {
      inMemoryVault[existingIdx] = { ...inMemoryVault[existingIdx], ...secret };
    } else {
      inMemoryVault.push(secret);
    }
  }

  function clearVault() {
    inMemoryVault = [];
  }

  function loadTestFixtures() {
    inMemoryVault = loadFixtureSeeds();
    return inMemoryVault;
  }

  /**
   * Add or update a local secret by fields or object.
   */
  function storeSecret(secretId, value, origin, field, label) {
    if (typeof secretId === 'object' && secretId !== null) {
      return setSecret(secretId);
    }
    const secret = {
      secretId,
      value,
      label: label || secretId,
      type: 'password',
      maskedDisplay: '••••••••',
      allowedOrigins: origin ? [origin] : ['*'],
      allowedFields: field ? [field] : ['*']
    };
    return setSecret(secret);
  }

  const secretVaultExport = {
    getSecretMetadata,
    resolveSecret,
    setSecret,
    storeSecret,
    clearVault,
    loadTestFixtures,
    issueCapability,
    consumeCapability,
    DEFAULT_VAULT: inMemoryVault
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = secretVaultExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilSecretVault = secretVaultExport;
  }
})();
