/**
 * VEIL — Failure Mode Taxonomy & Explainability Engine
 *
 * Explains "Why did VEIL stop or intervene?" with structured diagnostic reasoning,
 * formal error codes, and recommended remediations for evaluators and users.
 */

(function () {
  const FAILURE_TAXONOMY = {
    POLICY_SENSITIVE_FIELD_BLOCKED: {
      code: 'ERR_SEC_001',
      title: 'Sensitive Field Plaintext Block',
      category: 'SECURITY_POLICY',
      severity: 'CRITICAL',
      explanation: 'Remote model attempted to inject raw plaintext data into a field flagged as sensitive/redacted.',
      remediation: 'Use a local secret reference (e.g. valueRef: "LOCAL_SECRET_01") instead of raw credentials.'
    },
    DOMAIN_SCOPE_VIOLATION: {
      code: 'ERR_VAULT_002',
      title: 'Cross-Origin Vault Access Refused',
      category: 'VAULT_SECURITY',
      severity: 'HIGH',
      explanation: 'The requested local secret is not authorized for use on this web origin/domain.',
      remediation: 'Add the target origin to the secret\'s allowedOrigins whitelist in the Vault configuration.'
    },
    FIELD_SCOPE_MISMATCH: {
      code: 'ERR_VAULT_003',
      title: 'Field Scope Incompatibility',
      category: 'VAULT_SECURITY',
      severity: 'MEDIUM',
      explanation: 'The requested secret type (e.g. Credit Card) cannot be injected into the target input field type.',
      remediation: 'Verify that the target element matches the secret\'s allowedFields specification.'
    },
    HIGH_RISK_CONFIRMATION_REQUIRED: {
      code: 'ERR_GUARD_004',
      title: 'High-Stakes Transaction Confirmation Required',
      category: 'ACTION_GUARD',
      severity: 'HIGH',
      explanation: 'The proposed action modifies financial or destructive state (e.g. purchase, delete, transfer).',
      remediation: 'Request explicit interactive user confirmation before proceeding with native dispatch.'
    },
    TARGET_NOT_RESOLVED: {
      code: 'ERR_RESOLVER_005',
      title: 'Semantic Target Resolution Failed',
      category: 'RESOLVER',
      severity: 'LOW',
      explanation: 'No element in the live DOM matched the target data-veil-id or semantic natural language description.',
      remediation: 'Re-perceive the page layout or verify that the requested button exists in the active viewport.'
    },
    PROMPT_INJECTION_FLAGGED: {
      code: 'ERR_PROMPT_006',
      title: 'Adversarial Prompt Injection Detected',
      category: 'PROMPT_DEFENSE',
      severity: 'CRITICAL',
      explanation: 'DOM label or attribute contained known adversarial prompt override sequences.',
      remediation: 'Sanitize or drop the hostile element from the context representation.'
    },
    DOM_MUTATION_DETECTED: {
      code: 'ERR_DOM_007',
      title: 'Dynamic DOM Mutation Mismatch',
      category: 'INTEGRITY_GUARD',
      severity: 'HIGH',
      explanation: 'The target element mutated its label or function after the initial perception pass was completed.',
      remediation: 'Abort stale execution and trigger an immediate re-perception cycle.'
    },
    STEP_BUDGET_EXCEEDED: {
      code: 'ERR_ORCH_008',
      title: 'Autonomous Step Budget Limit Reached',
      category: 'ORCHESTRATOR',
      severity: 'MEDIUM',
      explanation: 'The agent execution reached the maximum allowable step budget (MAX_STEPS = 5).',
      remediation: 'Hand execution control over to the user to avoid runaway autonomous loops.'
    }
  };

  /**
   * Diagnoses an execution failure or refusal and returns an explanatory report.
   *
   * @param {string} rawReason
   * @param {object} [context]
   * @returns {{
   *   code: string,
   *   title: string,
   *   category: string,
   *   severity: string,
   *   explanation: string,
   *   remediation: string,
   *   rawReason: string
   * }}
   */
  function explainFailure(rawReason, context = {}) {
    if (!rawReason) return { code: 'ERR_NONE', title: 'Operational', severity: 'INFO' };
    const reason = (rawReason || '').toLowerCase();

    let matchedType = 'TARGET_NOT_RESOLVED';

    if (reason.includes('blocked-sensitive') || reason.includes('sensitive/redacted')) {
      matchedType = 'POLICY_SENSITIVE_FIELD_BLOCKED';
    } else if (reason.includes('domain-scope-violation')) {
      matchedType = 'DOMAIN_SCOPE_VIOLATION';
    } else if (reason.includes('field-scope-mismatch')) {
      matchedType = 'FIELD_SCOPE_MISMATCH';
    } else if (reason.includes('high-stakes') || reason.includes('confirmation')) {
      matchedType = 'HIGH_RISK_CONFIRMATION_REQUIRED';
    } else if (reason.includes('prompt injection') || reason.includes('adversarial')) {
      matchedType = 'PROMPT_INJECTION_FLAGGED';
    } else if (reason.includes('mutation') || reason.includes('mutated')) {
      matchedType = 'DOM_MUTATION_DETECTED';
    } else if (reason.includes('step budget') || reason.includes('max_steps')) {
      matchedType = 'STEP_BUDGET_EXCEEDED';
    }

    const taxonomy = FAILURE_TAXONOMY[matchedType];

    return {
      code: taxonomy.code,
      title: taxonomy.title,
      category: taxonomy.category,
      severity: taxonomy.severity,
      explanation: taxonomy.explanation,
      remediation: taxonomy.remediation,
      rawReason,
      context
    };
  }

  const failureAnalyzerExport = { explainFailure, FAILURE_TAXONOMY };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = failureAnalyzerExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilFailureAnalyzer = failureAnalyzerExport;
  }
})();
