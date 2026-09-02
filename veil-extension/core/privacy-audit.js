/**
 * VEIL — Privacy Audit Engine
 *
 * The last gate before any data leaves the device.
 *
 * Architecture:
 *   RAW CONTEXT → DETECT → REDACT → AUDIT → { PASS → TRANSMIT | FAIL → BLOCK }
 *
 * This module inspects the *outbound* sanitized context and verifies that:
 *   1. No element marked `sensitive` carries a `value` field
 *   2. No raw PII patterns (emails, phones, cards, Aadhaar, PAN) appear
 *      anywhere in the serialized payload
 *   3. The total leak count is exactly zero before the request is allowed
 *
 * If ANY check fails, the audit returns status: "FAIL" and the network
 * layer MUST refuse to transmit the payload.
 */

(function () {
  /* ---- Regex patterns for raw PII in serialized strings ---- */
  const _EMAIL_RE  = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const _PHONE_RE  = /(?:\+\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]\d{3,4}[-.\s]?\d{2,4}/g;
  const _AADHAAR_RE = /\b\d{4}\s\d{4}\s\d{4}\b/g;
  const _PAN_RE    = /\b[A-Z]{5}\d{4}[A-Z]\b/g;
  const _CC_RE     = /\b(?:\d[ -]?){13,19}\b/g;

  function _luhn(raw) {
    const d = raw.replace(/\D/g, '');
    if (d.length < 13 || d.length > 19) return false;
    let sum = 0, dbl = false;
    for (let i = d.length - 1; i >= 0; i--) {
      let n = parseInt(d[i], 10);
      if (dbl) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
      dbl = !dbl;
    }
    return sum % 10 === 0;
  }

  /**
   * Scan a serialized JSON string for any residual PII patterns.
   * @param {string} payload — JSON.stringify'd outbound context
   * @returns {Array<{type: string, match: string}>} — list of leaked values found
   */
  function _scanPayloadForPII(payload) {
    const leaks = [];
    let m;

    _EMAIL_RE.lastIndex = 0;
    while ((m = _EMAIL_RE.exec(payload))) {
      leaks.push({ type: 'email', match: m[0] });
    }

    _PHONE_RE.lastIndex = 0;
    while ((m = _PHONE_RE.exec(payload))) {
      leaks.push({ type: 'phone', match: m[0] });
    }

    _AADHAAR_RE.lastIndex = 0;
    while ((m = _AADHAAR_RE.exec(payload))) {
      leaks.push({ type: 'aadhaar', match: m[0] });
    }

    _PAN_RE.lastIndex = 0;
    while ((m = _PAN_RE.exec(payload))) {
      leaks.push({ type: 'pan', match: m[0] });
    }

    _CC_RE.lastIndex = 0;
    while ((m = _CC_RE.exec(payload))) {
      if (_luhn(m[0])) {
        leaks.push({ type: 'credit_card', match: m[0] });
      }
    }

    return leaks;
  }

  /**
   * Run the full privacy audit on an outbound context.
   *
   * @param {{elements: Array<{id: string, tag: string, label: string, sensitive: boolean}>}} context
   *   — the sanitized context from context-builder.js
   * @param {string} [task] — optional task instruction (not audited, but logged)
   * @returns {{
   *   status: "PASS"|"FAIL",
   *   sensitiveRegions: number,
   *   redactedRegions: number,
   *   leakedRegions: number,
   *   leaks: Array<{type: string, match: string}>,
   *   timestamp: number
   * }}
   */
  function runPrivacyAudit(context, task) {
    const elements = (context && context.elements) || [];
    const timestamp = Date.now();

    // Count sensitive elements
    const sensitiveRegions = elements.filter((el) => el.sensitive).length;

    // Check #1: no element should carry a `value` field
    const valueLeaks = elements.filter((el) => 'value' in el && el.value !== undefined && el.value !== null);

    // Check #2: scan the serialized payload for residual PII
    const serialized = JSON.stringify(context);
    const payloadLeaks = _scanPayloadForPII(serialized);

    // Also scan the task instruction (if attacker tries to smuggle PII through the task field)
    const taskLeaks = task ? _scanPayloadForPII(task) : [];

    const allLeaks = [
      ...valueLeaks.map((el) => ({ type: 'value_leak', match: `element ${el.id} contains value` })),
      ...payloadLeaks,
      ...taskLeaks.map((l) => ({ ...l, type: `task_${l.type}` })),
    ];

    const leakedRegions = allLeaks.length;
    const redactedRegions = sensitiveRegions;

    return {
      status: leakedRegions === 0 ? 'PASS' : 'FAIL',
      sensitiveRegions,
      redactedRegions,
      leakedRegions,
      leaks: allLeaks,
      timestamp,
    };
  }

  const privacyAuditExport = { runPrivacyAudit };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = privacyAuditExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilPrivacyAudit = privacyAuditExport;
  }
})();
