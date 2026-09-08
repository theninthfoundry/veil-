/**
 * VEIL — Canonical DOM State Hasher & Element Fingerprinter
 *
 * Implements Invariant I3:
 * "Every Action Capability is cryptographically bound to a canonical DOM snapshot hash.
 *  If stateHash_current != stateHash_proposed, the action fails closed."
 *
 * Prevents:
 *   - Price swapping (e.g. ₹500 changed to ₹50,000 between perception and execution)
 *   - Button swapping (e.g. 'Cancel' changed to 'Delete Account')
 *   - Adversarial DOM replacement & clickjacking overlays
 *   - Form action hijacking
 */

(function () {
  const securityLedger = typeof require !== 'undefined'
    ? require('./security-ledger.js')
    : (typeof window !== 'undefined' ? window.VeilSecurityLedger : null);

  const sha256 = (securityLedger && securityLedger.sha256Sync) || function (ascii) {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(ascii, 'utf8').digest('hex');
      } catch (_) {}
    }
    let hash = 0;
    for (let i = 0; i < ascii.length; i++) {
      hash = ((hash << 5) - hash) + ascii.charCodeAt(i);
      hash |= 0;
    }
    return 'sha256_mock_' + Math.abs(hash).toString(16);
  };

  /**
   * Computes a stable semantic fingerprint for a single DOM element.
   *
   * @param {Element} element
   * @returns {string}
   */
  function computeElementFingerprint(element) {
    if (!element) return 'null_element';
    const getAttr = (typeof element.getAttribute === 'function') ? (attr) => element.getAttribute(attr) : () => null;
    const tag = (element.tagName || '').toLowerCase();
    const role = getAttr('role') || getAttr('type') || '';
    const id = element.id || '';
    const name = getAttr('name') || '';
    const ariaLabel = getAttr('aria-label') || '';
    const rawText = (element.textContent || '').trim().slice(0, 50).replace(/\s+/g, ' ');
    const label = (ariaLabel || rawText || getAttr('placeholder') || '').toLowerCase();

    return `${tag}:${role}:${id}:${name}:${label}`;
  }

  /**
   * Generates a deterministic canonical string and SHA-256 hash of the document's interactive state.
   *
   * @param {Document} doc - Active Document object
   * @returns {{ stateHash: string, elementCount: number, canonicalSummary: string }}
   */
  function computeStateHash(doc) {
    if (!doc || !doc.querySelectorAll) {
      return { stateHash: 'empty_document_hash', elementCount: 0, canonicalSummary: '' };
    }

    const interactiveSelector = 'button, input, select, textarea, a[href], [role="button"], [role="link"], [role="checkbox"], form, [id*="price"], [id*="amount"], [id*="total"], [id*="balance"], [class*="price"], [class*="amount"]';
    const elements = doc.querySelectorAll(interactiveSelector);

    const canonicalLines = [];

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      // Skip hidden or invisible elements
      if (el.style && (el.style.display === 'none' || el.style.visibility === 'hidden')) {
        continue;
      }

      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute('role') || el.getAttribute('type') || '';
      const id = el.id || '';
      const name = el.getAttribute('name') || '';
      const disabled = Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true');

      // Extract text content and label
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      const ariaLabel = el.getAttribute('aria-label') || '';
      const placeholder = el.getAttribute('placeholder') || '';
      const normLabel = (ariaLabel || text || placeholder).toLowerCase();

      // Extract numeric markers (amounts, prices, counts) to thwart price-swap attacks
      const digits = normLabel.replace(/[^\d.]/g, '');

      // Check form action if element is inside form or is form
      const form = el.form || (tag === 'form' ? el : null);
      const formAction = form ? (form.getAttribute('action') || '') : '';

      canonicalLines.push(`${tag}|${role}|${id}|${name}|${disabled}|${normLabel}|${digits}|${formAction}`);
    }

    const canonicalSummary = canonicalLines.join('\n');
    const stateHash = sha256(canonicalSummary);

    return {
      stateHash,
      elementCount: canonicalLines.length,
      canonicalSummary
    };
  }

  /**
   * Compares two DOM state hashes.
   */
  function isStateConsistent(observedHash, currentHash) {
    return observedHash === currentHash;
  }

  const exportObj = {
    computeElementFingerprint,
    computeStateHash,
    isStateConsistent,
    sha256
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportObj;
  }
  if (typeof window !== 'undefined') {
    window.VeilStateHasher = exportObj;
  }
})();
