#!/usr/bin/env node
/**
 * Test improved detector on all 15 fixtures
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// --- Improved patterns ---

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const AADHAAR_RE = /\b\d{4}\s\d{4}\s\d{4}\b/g;
const PAN_RE = /\b[A-Z]{5}\d{4}[A-Z]\b/g;

// Standard credit cards are 13 to 19 digits (Amex=15, Visa/MC/RuPay=16, etc.)
// Minimum 13 digits prevents 12-digit numbers (like +91 phones) from Luhn-matching as cards.
const CC_CANDIDATE_RE = /\b(?:\d[ -]?){13,19}\b/g;

// Phone: Must have at least 10 digits (or toll-free 1800) and proper delimiters or + country code
// Reject if preceded by transaction / invoice / reference prefixes like TXN-, INV-, REF-, FP-
const PHONE_CANDIDATES = [
  // International / with country code (+91 98765-43210, +1 (555) 123-4567)
  /\+?\d{1,3}[-.\s]\(?\d{3,5}\)?[-.\s]\d{3,5}[-.\s]?\d{2,5}\b/g,
  // Toll-free (1800-200-3344, 1800 123 4567)
  /\b1800[-.\s]\d{3,4}[-.\s]\d{3,4}\b/g,
  // Standard 10-digit Indian/US (98765-43210, (555) 234-5678, 98765 43210)
  /\b(?:\(?\d{3,5}\)?[-.\s])\d{3,4}[-.\s]\d{3,4}\b/g
];

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

function isPrecededByNonPhonePrefix(text, index) {
  const prefix = text.substring(Math.max(0, index - 10), index);
  return /(?:TXN|REF|INV|ORDER|FP|ID|NO|FORMAT|CODE|REG)[-_:#\s]*$/i.test(prefix);
}

function collectMatches(re, type, confidence, text, out) {
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text))) {
    out.push({ type, confidence, start: m.index, end: m.index + m[0].length, raw: m[0] });
    if (re.lastIndex === m.index) re.lastIndex++;
  }
}

const TYPE_PRIORITY = { credit_card: 6, pan: 5, aadhaar: 4, email: 3, phone: 2 };

function scanText(text, container, method, baseConfidence) {
  if (!text) return [];
  const candidates = [];

  collectMatches(PAN_RE, 'pan', baseConfidence, text, candidates);
  collectMatches(AADHAAR_RE, 'aadhaar', baseConfidence, text, candidates);
  collectMatches(EMAIL_RE, 'email', baseConfidence, text, candidates);

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

  for (const pRe of PHONE_CANDIDATES) {
    pRe.lastIndex = 0;
    while ((m = pRe.exec(text))) {
      const raw = m[0];
      const digits = raw.replace(/\D/g, '');
      if (digits.length >= 10 && digits.length <= 15 && !isPrecededByNonPhonePrefix(text, m.index)) {
        candidates.push({
          type: 'phone',
          confidence: Math.min(baseConfidence, 0.7),
          start: m.index,
          end: m.index + raw.length,
          raw
        });
      }
      if (pRe.lastIndex === m.index) pRe.lastIndex++;
    }
  }

  candidates.sort((a, b) => TYPE_PRIORITY[b.type] - TYPE_PRIORITY[a.type] || a.start - b.start);
  const claimed = [];
  const accepted = [];
  for (const c of candidates) {
    const overlaps = claimed.some(([s, e]) => c.start < e && c.end > s);
    if (overlaps) continue;
    claimed.push([c.start, c.end]);
    accepted.push(c);
  }

  return accepted.map((c) => ({ type: c.type, method, confidence: c.confidence, element: container }));
}

console.log('Testing scanText on problem cases:');
console.log('1. bank-dashboard text: "Linked mobile: +91 98765-43210. TXN-20260901-0045782. For support, call 1800-200-3344"');
console.log(scanText('Linked mobile: +91 98765-43210. TXN-20260901-0045782. For support, call 1800-200-3344', null, 'regex', 0.85));

console.log('\n2. social-profile text: "Phone: +91 99887-76655. Email: priya.nair@example.com"');
console.log(scanText('Phone: +91 99887-76655. Email: priya.nair@example.com', null, 'regex', 0.85));

console.log('\n3. false-positive-stress text: "Registration format IN-FP-001-23456 with 4,521 entities."');
console.log(scanText('Registration format IN-FP-001-23456 with 4,521 entities.', null, 'regex', 0.85));
