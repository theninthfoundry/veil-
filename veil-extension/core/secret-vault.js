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
  // Built-in default seed secrets for demonstration & testing
  const DEFAULT_VAULT = [
    {
      secretId: 'LOCAL_SECRET_01',
      label: 'Demo Visa Card',
      type: 'credit_card',
      maskedDisplay: '•••• •••• •••• 1111',
      allowedOrigins: ['localhost', '127.0.0.1', '*'],
      allowedFields: ['card', 'card_number', 'cc-number', 'credit_card'],
      value: '4111 1111 1111 1111'
    },
    {
      secretId: 'LOCAL_SECRET_02',
      label: 'Demo CVV Code',
      type: 'cvv',
      maskedDisplay: '•••',
      allowedOrigins: ['localhost', '127.0.0.1', '*'],
      allowedFields: ['cvv', 'cvc', 'cc-csc', 'security_code'],
      value: '421'
    },
    {
      secretId: 'LOCAL_SECRET_03',
      label: 'Primary Shipping Address',
      type: 'address',
      maskedDisplay: 'Flat 402, Cyber Heights, Hyderabad...',
      allowedOrigins: ['localhost', '127.0.0.1', '*'],
      allowedFields: ['address', 'street-address', 'shipping_address', 'street'],
      value: 'Flat 402, Cyber Heights, Hitec City, Hyderabad, 500081'
    },
    {
      secretId: 'LOCAL_SECRET_04',
      label: 'Primary Contact Phone',
      type: 'phone',
      maskedDisplay: '+91 98765-•••••',
      allowedOrigins: ['localhost', '127.0.0.1', '*'],
      allowedFields: ['phone', 'tel', 'mobile', 'notes', 'contact'],
      value: '+91 98765-43210'
    },
    {
      secretId: 'LOCAL_SECRET_05',
      label: 'Primary User Name',
      type: 'name',
      maskedDisplay: 'Sreeshanth R••••',
      allowedOrigins: ['localhost', '127.0.0.1', '*'],
      allowedFields: ['name', 'fullname', 'patient_name', 'account_holder'],
      value: 'Sreeshanth Reddy'
    },
    {
      secretId: 'LOCAL_SECRET_06',
      label: 'Primary Email Address',
      type: 'email',
      maskedDisplay: 'sreeshanth@••••••••••',
      allowedOrigins: ['localhost', '127.0.0.1', '*'],
      allowedFields: ['email', 'email_address', 'username'],
      value: 'sreeshanth@example.com'
    }
  ];

  let inMemoryVault = [...DEFAULT_VAULT];

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
   * Resolve a secret reference value locally with strict origin & field boundary checks.
   *
   * @param {string} secretId — e.g. "LOCAL_SECRET_01"
   * @param {string} currentOrigin — e.g. "localhost" or "127.0.0.1"
   * @param {string} fieldIdentifier — e.g. "card_number" or "notes"
   * @returns {{ok: boolean, value?: string, reason?: string, secretId: string, label?: string}}
   */
  function resolveSecret(secretId, currentOrigin, fieldIdentifier) {
    if (!secretId || typeof secretId !== 'string' || !/^LOCAL_SECRET_[A-Z0-9_]+$/i.test(secretId.trim())) {
      return { ok: false, reason: 'invalid-secret-id-format', secretId: String(secretId) };
    }

    const entry = inMemoryVault.find(s => s.secretId.toUpperCase() === secretId.trim().toUpperCase());
    if (!entry) {
      return { ok: false, reason: `unknown-secret-reference: ${secretId}`, secretId };
    }

    // 1. Origin Scope Check
    const origin = (currentOrigin || '').toLowerCase().replace(/:\d+$/, '');
    const originAllowed = entry.allowedOrigins.some(o => o === '*' || origin.includes(o.toLowerCase()));
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

  const secretVaultExport = { getSecretMetadata, resolveSecret, setSecret, DEFAULT_VAULT };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = secretVaultExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilSecretVault = secretVaultExport;
  }
})();
