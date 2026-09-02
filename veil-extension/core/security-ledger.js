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
      isoTime: new Date().toISOString().substring(11, 19),
      type,
      stage,
      detail,
      source
    };

    ledger.unshift(event);
    if (ledger.length > MAX_EVENTS) {
      ledger.pop();
    }

    // Persist to session storage if in extension context
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
      chrome.storage.session.set({ veilLedger: ledger.slice(0, 30) }).catch(() => {});
    }

    return event;
  }

  function getLedger() {
    return [...ledger];
  }

  function clearLedger() {
    ledger = [];
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
      chrome.storage.session.remove('veilLedger').catch(() => {});
    }
  }

  const securityLedgerExport = { recordEvent, getLedger, clearLedger };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = securityLedgerExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilSecurityLedger = securityLedgerExport;
  }
})();
