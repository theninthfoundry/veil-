/**
 * VEIL — Security Event Ledger
 *
 * Immutable-style append-only event log for auditing privacy & security events:
 *   - PII_DETECTED
 *   - REGION_REDACTED
 *   - PRIVACY_AUDIT_PASSED / PRIVACY_AUDIT_BLOCKED
 *   - SERVER_TRANSMISSION
 *   - MODEL_PROPOSAL
 *   - RISK_EVALUATED
 *   - ACTION_ALLOWED / ACTION_BLOCKED
 *   - ACTION_EXECUTED
 *   - DOM_MUTATION_DETECTED
 */

(function () {
  const MAX_EVENTS = 100;
  let ledger = [];

  function recordEvent(type, stage, detail, source = 'CLIENT') {
    const event = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      isoTime: new Date().toLocaleTimeString('en-US', { hour12: false }),
      epochMs: Date.now(),
      type,
      stage,
      detail,
      source
    };

    ledger.unshift(event);
    if (ledger.length > MAX_EVENTS) {
      ledger.pop();
    }

    // Persist to session storage if in valid extension context
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.session) {
        chrome.storage.session.set({ veilLedger: ledger.slice(0, 30) }).catch(() => {});
      }
    } catch (_) {
      // Extension context was invalidated on tab before reload
    }

    return event;
  }

  /** Returns copy of active security event ledger */
  function getLedger() {
    return [...ledger];
  }

  function clearLedger() {
    ledger = [];
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.session) {
        chrome.storage.session.remove('veilLedger').catch(() => {});
      }
    } catch (_) {}
  }

  const securityLedgerExport = { recordEvent, getLedger, clearLedger };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = securityLedgerExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilSecurityLedger = securityLedgerExport;
  }
})();
