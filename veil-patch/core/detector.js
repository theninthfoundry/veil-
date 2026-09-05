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

  // 12 digits grouped 4-4-4 — the standard Aadhaar display format (bounded to exactly 12 digits).
  const AADHAAR_RE = /(?<!\d)(?:\d{4}\s\d{4}\s\d{4})(?!\s?\d)/g;

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
    // Unseparated or singly-hyphenated 10-digit numbers after explicit phone keywords
    /(?:phone|mobile|tel|call|contact|whatsapp)[-:\s]+(\+?\d[\d\s-]{7,15}\d)\b/gi
  ];

  // Rejection rule: prefix looks like an order, invoice, reference, or transaction ID
  function isPrecededByNonPhonePrefix(text, index) {
    const prefix = text.substring(Math.max(0, index - 10), index);
    return /(?:TXN|REF|INV|ORDER|FP|ID|NO|FORMAT|CODE|REG)[-_:#\s]*$/i.test(prefix);
  }

  // Label-anchored free-text patterns (heuristic, not NER/NLP).
  //
  // These deliberately do NOT attempt bare Title-Case name recognition in prose — see
  // benchmark/fixtures/false-positive-stress.html, which specifically asserts that editorial
  // mentions of real people ("By Rohan Agarwal", a CEO quoted by name) must NOT be flagged.
  // A general-purpose name detector would fail that fixture. Instead, this only fires on an
  // explicit structured label immediately before the value — the pattern a receipt, ID card,
  // or confirmation page renders as static text (e.g. "Name: Sunita Devi Gupta",
  // "Father's Name: Ram Prasad Gupta", "Address: 42, MG Road, Sector 14, Gurgaon"), which is
  // exactly the free-text case a tagged-form-field-only scanner misses entirely.
  //
  // Known limitation: names/addresses embedded in prose without a preceding label (e.g. a
  // sentence-form "shipped to Priya Sharma at her new flat") are still not caught. Closing
  // that gap needs real NER, which is a genuine future-work item, not something to fake here.
  const NAME_LABEL_RE = /\b(?:[A-Za-z]+(?:'s)?\s+)?Name\s*:\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3})/g;
  const ADDRESS_LABEL_RE = /\b(?:Shipping|Delivery|Billing|Home|Residential|Permanent)?\s*Address\s*:\s*([A-Za-z0-9][A-Za-z0-9 ,.\/#-]{9,80})/g;

  // Rejection rule: "Name:" preceded by a non-person qualifier (brand/file/product name, etc.)
  // so "Brand Name: Nike" or "File Name: invoice.pdf" don't get flagged as a person's name.
  function isNonPersonNameLabel(text, matchStart) {
    const prefix = text.substring(Math.max(0, matchStart - 20), matchStart).toLowerCase();
    return /(?:brand|file|domain|product|company|screen|user|class|table|column|variable|function|module|package|field|method|event|property|display|host|server|device|project|app|application)\s*$/.test(prefix);
  }

  // Rejection rule: "Address:" preceded by an organizational qualifier — a bank branch,
  // company registered office, or store location is public business info, not personal PII.
  function isNonPersonalAddressLabel(text, matchStart) {
    const prefix = text.substring(Math.max(0, matchStart - 25), matchStart).toLowerCase();
    return /(?:branch|company|office|store|registered|corporate|warehouse|business|head\s?office|bank|outlet|showroom|restaurant|clinic|hospital)\s*$/.test(prefix);
  }

  // Priority for span conflict arbitration
  const TYPE_PRIORITY = { credit_card: 6, pan: 5, aadhaar: 4, email: 3, phone: 2, address: 1.5, name: 1 };

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
        if (digits.length >= 10 && digits.length <= 15 && !digits.startsWith('0000') && !isPrecededByNonPhonePrefix(text, m.index)) {
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

    // Free-text names, label-anchored (e.g. "Name:", "Father's Name:")
    NAME_LABEL_RE.lastIndex = 0;
    while ((m = NAME_LABEL_RE.exec(text))) {
      if (!isNonPersonNameLabel(text, m.index)) {
        const value = m[1];
        const valueStart = m.index + m[0].indexOf(value);
        candidates.push({
          type: 'name',
          confidence: Math.min(baseConfidence, 0.8),
          start: valueStart,
          end: valueStart + value.length,
          raw: value
        });
      }
      if (NAME_LABEL_RE.lastIndex === m.index) NAME_LABEL_RE.lastIndex++;
    }

    // Free-text addresses, label-anchored (e.g. "Address:", "Shipping Address:")
    ADDRESS_LABEL_RE.lastIndex = 0;
    while ((m = ADDRESS_LABEL_RE.exec(text))) {
      if (!isNonPersonalAddressLabel(text, m.index)) {
        const value = m[1].trim();
        const valueStart = m.index + m[0].indexOf(m[1]);
        candidates.push({
          type: 'address',
          confidence: Math.min(baseConfidence, 0.8),
          start: valueStart,
          end: valueStart + m[1].length,
          raw: value
        });
      }
      if (ADDRESS_LABEL_RE.lastIndex === m.index) ADDRESS_LABEL_RE.lastIndex++;
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

    return accepted.map((c) => ({
      type: c.type,
      method,
      confidence: c.confidence,
      element: container || null,
      raw: c.raw
    }));
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

  const detectorExport = { scanForPII, scanText, luhnCheck, PII_TYPES };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = detectorExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilDetector = detectorExport;
  }
})();
