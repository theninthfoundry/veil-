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
 * characters (an Aadhaar-shaped 4-4-4 number also looks like a phone number),
 * the more specific type wins and the weaker match is dropped, rather than
 * counting one real item as two different PII types.
 *
 * A local vision fallback (faces, PII baked into images/canvas) is a separate
 * concern, intentionally stubbed at the bottom — see README, phase 3.
 */

const PII_TYPES = {
  password: { label: 'Password field' },
  email: { label: 'Email address' },
  phone: { label: 'Phone number' },
  credit_card: { label: 'Card number' },
  address: { label: 'Address' },
  name: { label: 'Full name' },
  aadhaar: { label: 'Aadhaar-like ID' },
  pan: { label: 'PAN-like ID' },
};

// ---- regexes (all global — every match in a block of text is a candidate) ----

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Requires a separator or a leading + country code — bare same-length digit
// runs (order numbers, IDs) are common, and this cuts a lot of false positives.
const PHONE_RE = /(?:\+\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]\d{3,4}[-.\s]?\d{2,4}\b/g;

// 12 digits grouped 4-4-4 — the standard Aadhaar display format.
const AADHAAR_RE = /\b\d{4}\s\d{4}\s\d{4}\b/g;

// 5 letters, 4 digits, 1 letter — the PAN format.
const PAN_RE = /\b[A-Z]{5}\d{4}[A-Z]\b/g;

// Candidate digit runs that *might* be a card number — every candidate is
// Luhn-checked before being counted, which is what keeps precision high.
const CC_CANDIDATE_RE = /\b(?:\d[ -]?){12,19}\b/g;

// More specific / more validated pattern wins a span conflict. credit_card
// outranks aadhaar deliberately: a Luhn-validated 16-digit card number's
// first 12 digits also happen to look like an Aadhaar number (4-4-4 grouped),
// and the checksum-validated match is the more trustworthy read of those
// digits.
const TYPE_PRIORITY = { credit_card: 6, pan: 5, aadhaar: 4, email: 3, phone: 1 };

function luhnCheck(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 19) return false;
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
    if (re.lastIndex === m.index) re.lastIndex++; // guard against zero-length matches
  }
}

/** Regex-scan a block of text, attributing any hits to `container`. */
function scanText(text, container, method, baseConfidence) {
  if (!text) return [];
  const candidates = [];

  collectMatches(PAN_RE, 'pan', baseConfidence, text, candidates);
  collectMatches(AADHAAR_RE, 'aadhaar', baseConfidence, text, candidates);
  collectMatches(EMAIL_RE, 'email', baseConfidence, text, candidates);

  CC_CANDIDATE_RE.lastIndex = 0;
  let m;
  while ((m = CC_CANDIDATE_RE.exec(text))) {
    if (luhnCheck(m[0])) {
      candidates.push({ type: 'credit_card', confidence: Math.max(baseConfidence, 0.9), start: m.index, end: m.index + m[0].length, raw: m[0] });
    }
    if (CC_CANDIDATE_RE.lastIndex === m.index) CC_CANDIDATE_RE.lastIndex++;
  }

  collectMatches(PHONE_RE, 'phone', Math.min(baseConfidence, 0.6), text, candidates);

  // Resolve overlapping spans: higher-priority (more specific) type wins,
  // the weaker match on the same characters is dropped entirely.
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

// field name/id/placeholder keyword fallback — used only when type and
// autocomplete gave us nothing. Lower confidence, still cheap and fast.
const KEYWORD_HEURISTICS = [
  { re: /\b(card[-_]?num|creditcard|cardnumber)\b/, type: 'credit_card' },
  { re: /\bcvv|cvc|security[-_ ]?code\b/, type: 'credit_card' },
  { re: /\b(phone|mobile|contact[-_ ]?no)\b/, type: 'phone' },
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

    // Nothing labeled this field — it's a free-text field (comments, message,
    // notes). Regex-scan its actual content so PII typed into an unlabeled
    // box doesn't slip through. This is the case a DOM-attribute-only scanner
    // would miss entirely.
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
function scanForPII(root) {
  return [...scanFormFields(root), ...scanVisibleText(root)];
}

// Phase 3 stub — local vision fallback for faces / raster PII is intentionally
// not implemented here. Kept as an explicit no-op so the pipeline shape is
// ready without pretending this phase does more than it does.
function scanForFaces() {
  return [];
}

const api = { scanForPII, scanForFaces, luhnCheck, PII_TYPES };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.VeilDetector = api;
}
