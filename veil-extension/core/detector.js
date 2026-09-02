/**
 * VEIL — PII detector
 *
 * Pure detection logic. No chrome.* APIs, no rendering. Runs identically in:
 *   - the browser content script (real DOM)
 *   - the Node benchmark harness (jsdom)
 *
 * Detection priority, cheapest and most precise first:
 *   1. DOM attribute (input type, autocomplete spec values)   — near-certain
 *   2. DOM heuristic (field name/id/placeholder keywords)     — likely
 *   3. Regex over field content and visible text (email, phone, card,
 *      Aadhaar/PAN patterns), card numbers Luhn-validated       — probable
 *
 * Regex matches are arbitrated by span: if two patterns match the same
 * characters, the more specific / context-validated type wins and the weaker match
 * is dropped, rather than counting one real item as two different PII types.
 */

(function () {
  const PII_TYPES = {
    password: { label: 'Password field' },
    email: { label: 'Email address' },
    phone: { label: 'Phone number' },
    credit_card: { label: 'Card number' },
    address: { label: 'Address' },
    name: { label: 'Full name' },
    aadhaar: { label: 'Aadhaar-like ID' },
    pan: { label: 'PAN-like ID' },
    face: { label: 'Face detected' },
  };

  // ---- regexes (all global — every match in a block of text is a candidate) ----

  const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  // 12 digits grouped 4-4-4 — the standard Aadhaar display format.
  const AADHAAR_RE = /\b\d{4}\s\d{4}\s\d{4}\b/g;

  // 5 letters, 4 digits, 1 letter — the PAN format.
  const PAN_RE = /\b[A-Z]{5}\d{4}[A-Z]\b/g;

  // Standard credit cards are 13 to 19 digits (Amex=15, Visa/MC/RuPay=16, etc.)
  // Minimum 13 digits prevents shorter numbers (like +91 phones) from Luhn-matching as cards.
  const CC_CANDIDATE_RE = /\b(?:\d[ -]?){13,19}\b/g;

  // Phone candidate patterns: require international prefix (+91, +1), toll-free (1800),
  // or standard 10-digit separated format.
  const PHONE_CANDIDATES = [
    // International / with country code (+91 98765-43210, +1 (555) 123-4567, +91 9876543210)
    /\+?\d{1,3}[-.\s]\(?\d{3,5}\)?[-.\s]\d{3,5}[-.\s]?\d{2,5}\b/g,
    // Toll-free (1800-200-3344, 1800 123 4567)
    /\b1800[-.\s]\d{3,4}[-.\s]\d{3,4}\b/g,
    // Standard 10-digit Indian/US separated ((555) 234-5678, 98765-43210, 98765 43210)
    /\b(?:\(?\d{3,5}\)?[-.\s])\d{3,4}[-.\s]\d{3,4}\b/g,
    // Unseparated 10-digit numbers inside fields or after explicit phone keywords
    /(?:phone|mobile|tel|call|contact|whatsapp)[-:\s]+(\+?\d{10,14})\b/gi
  ];

  // Rejection rule: prefix looks like an order, invoice, reference, or transaction ID
  function isPrecededByNonPhonePrefix(text, index) {
    const prefix = text.substring(Math.max(0, index - 10), index);
    return /(?:TXN|REF|INV|ORDER|FP|ID|NO|FORMAT|CODE|REG)[-_:#\s]*$/i.test(prefix);
  }

  // Priority for span conflict arbitration
  const TYPE_PRIORITY = { credit_card: 6, pan: 5, aadhaar: 4, email: 3, phone: 2 };

  function luhnCheck(raw) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let double = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = parseInt(digits[i], 10);
      if (double) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      double = !double;
    }
    return sum % 10 === 0;
  }

  function makeDetection(type, method, confidence, element) {
    return { type, method, confidence, element: element || null };
  }

  function collectMatches(re, type, confidence, text, out) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      out.push({ type, confidence, start: m.index, end: m.index + m[0].length, raw: m[0] });
      if (re.lastIndex === m.index) re.lastIndex++;
    }
  }

  /** Regex-scan a block of text, attributing any hits to `container`. */
  function scanText(text, container, method, baseConfidence) {
    if (!text) return [];
    const candidates = [];

    collectMatches(PAN_RE, 'pan', baseConfidence, text, candidates);
    collectMatches(AADHAAR_RE, 'aadhaar', baseConfidence, text, candidates);
    collectMatches(EMAIL_RE, 'email', baseConfidence, text, candidates);

    // Credit cards
    CC_CANDIDATE_RE.lastIndex = 0;
    let m;
    while ((m = CC_CANDIDATE_RE.exec(text))) {
      const raw = m[0];
      const digits = raw.replace(/\D/g, '');
      if (digits.length >= 13 && digits.length <= 19 && luhnCheck(raw)) {
        candidates.push({
          type: 'credit_card',
          confidence: Math.max(baseConfidence, 0.9),
          start: m.index,
          end: m.index + raw.length,
          raw
        });
      }
      if (CC_CANDIDATE_RE.lastIndex === m.index) CC_CANDIDATE_RE.lastIndex++;
    }

    // Phones
    for (const pRe of PHONE_CANDIDATES) {
      pRe.lastIndex = 0;
      while ((m = pRe.exec(text))) {
        const matchText = m[1] || m[0];
        const matchStart = m[1] ? m.index + m[0].indexOf(m[1]) : m.index;
        const digits = matchText.replace(/\D/g, '');
        if (digits.length >= 10 && digits.length <= 15 && !isPrecededByNonPhonePrefix(text, m.index)) {
          candidates.push({
            type: 'phone',
            confidence: Math.min(baseConfidence, 0.7),
            start: matchStart,
            end: matchStart + matchText.length,
            raw: matchText
          });
        }
        if (pRe.lastIndex === m.index) pRe.lastIndex++;
      }
    }

    // Resolve overlapping spans: higher-priority (more specific) type wins
    candidates.sort((a, b) => TYPE_PRIORITY[b.type] - TYPE_PRIORITY[a.type] || a.start - b.start);
    const claimed = [];
    const accepted = [];
    for (const c of candidates) {
      const overlaps = claimed.some(([s, e]) => c.start < e && c.end > s);
      if (overlaps) continue;
      claimed.push([c.start, c.end]);
      accepted.push(c);
    }

    return accepted.map((c) => makeDetection(c.type, method, c.confidence, container));
  }

  // autocomplete spec values -> our type vocabulary
  const AUTOCOMPLETE_MAP = {
    'cc-number': 'credit_card',
    'cc-csc': 'credit_card',
    'cc-exp': 'credit_card',
    'cc-name': 'credit_card',
    'tel-national': 'phone',
    tel: 'phone',
    email: 'email',
    'street-address': 'address',
    'address-line1': 'address',
    'address-line2': 'address',
    'postal-code': 'address',
    name: 'name',
    'given-name': 'name',
    'family-name': 'name',
  };

  // field name/id/placeholder keyword fallback
  const KEYWORD_HEURISTICS = [
    { re: /\b(card[-_]?num|creditcard|cardnumber)\b/, type: 'credit_card' },
    { re: /\bcvv|cvc|security[-_ ]?code\b/, type: 'credit_card' },
    { re: /\b(phone|mobile|contact[-_ ]?no|telephone)\b/, type: 'phone' },
    { re: /\b(email|e-mail)\b/, type: 'email' },
    { re: /\b(address|street|zip|postal|pincode|pin[-_ ]?code)\b/, type: 'address' },
    { re: /\b(aadhaar|aadhar)\b/, type: 'aadhaar' },
    { re: /\bpan[-_ ]?(number|no|card)?\b/, type: 'pan' },
    { re: /\b(fullname|full[-_ ]?name|firstname|first[-_ ]?name|lastname|last[-_ ]?name)\b/, type: 'name' },
  ];

  function scanFormFields(root) {
    const results = [];
    const fields = root.querySelectorAll('input, textarea, select');

    fields.forEach((el) => {
      const type = (el.getAttribute('type') || '').toLowerCase();
      const autocomplete = (el.getAttribute('autocomplete') || '').toLowerCase();
      const haystack = [el.getAttribute('name'), el.getAttribute('id'), el.getAttribute('placeholder')]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (type === 'password') {
        results.push(makeDetection('password', 'dom-attribute', 0.99, el));
        return;
      }
      if (type === 'email') {
        results.push(makeDetection('email', 'dom-attribute', 0.95, el));
        return;
      }
      if (type === 'tel') {
        results.push(makeDetection('phone', 'dom-attribute', 0.9, el));
        return;
      }

      for (const key of Object.keys(AUTOCOMPLETE_MAP)) {
        if (autocomplete.includes(key)) {
          results.push(makeDetection(AUTOCOMPLETE_MAP[key], 'dom-attribute', 0.9, el));
          return;
        }
      }

      for (const h of KEYWORD_HEURISTICS) {
        if (h.re.test(haystack)) {
          results.push(makeDetection(h.type, 'dom-heuristic', 0.7, el));
          return;
        }
      }

      // Free-text field regex scan
      const isFreeText = el.tagName === 'TEXTAREA' || type === '' || type === 'text';
      if (isFreeText) {
        const content = el.value || el.textContent || el.getAttribute('value') || '';
        results.push(...scanText(content, el, 'regex-in-field', 0.7));
      }
    });

    return results;
  }

  function getDoc(root) {
    return root.nodeType === 9 ? root : root.ownerDocument;
  }

  function scanVisibleText(root) {
    const results = [];
    const doc = getDoc(root);
    const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */, {
      acceptNode(node) {
        const parentTag = node.parentElement ? node.parentElement.tagName : '';
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(parentTag)) {
          return 2; // FILTER_REJECT
        }
        if (!node.textContent || !node.textContent.trim()) return 2;
        return 1; // FILTER_ACCEPT
      },
    });

    let node;
    while ((node = walker.nextNode())) {
      results.push(...scanText(node.textContent, node.parentElement, 'regex', 0.85));
    }

    return results;
  }

  /**
   * Scan a document (or element) for PII.
   * @param {Document|Element} root
   * @returns {Array<{type: string, method: string, confidence: number, element: Element|null}>}
   */
  /**
 * Comprehensive PII scan across DOM attributes and visible text.
 * @param {Document|Element} root - Target DOM node or document
 * @returns {Array<{type: string, method: string, confidence: number, element: Element|null}>}
 */
function scanForPII(root) {
    return [...scanFormFields(root), ...scanVisibleText(root)];
  }

  const detectorExport = { scanForPII, luhnCheck, PII_TYPES };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = detectorExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilDetector = detectorExport;
  }
})();
