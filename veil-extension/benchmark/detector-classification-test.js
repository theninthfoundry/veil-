/**
 * VEIL — Standalone Detector PII Classification Unit Test
 *
 * Verifies category-specific validators and span conflict arbitration:
 *  - 16-digit Luhn cards vs 12-digit Aadhaar vs 10-digit PAN vs Phones vs Emails
 */

const detector = require('../core/detector.js');

console.log('='.repeat(70));
console.log('VEIL — Detector Standalone Classification Test');
console.log('='.repeat(70));

const TEST_CASES = [
  { text: 'Card: 4111 1111 1111 1111', expected: 'credit_card' },
  { text: 'UID: 1234 5678 9012', expected: 'aadhaar' },
  { text: 'Email: test@example.com', expected: 'email' },
  { text: 'Call: +91 98765-43210', expected: 'phone' },
  { text: 'PAN: ABCDE1234F', expected: 'pan' }
];

let passed = 0;
for (const tc of TEST_CASES) {
  const hits = detector.scanText(tc.text, null, 'regex', 0.9);
  const matchedTypes = hits.map(h => h.type);
  const ok = matchedTypes.includes(tc.expected) && (tc.expected !== 'credit_card' || !matchedTypes.includes('aadhaar'));

  console.log(`  ${ok ? '✔ [PASS]' : '✖ [FAIL]'} "${tc.text}" ➔ Detected: [${matchedTypes.join(', ')}] (Expected: ${tc.expected})`);
  if (ok) passed++;
}

console.log('='.repeat(70));
console.log(`Classification Summary: ${passed} / ${TEST_CASES.length} Passed`);
console.log('='.repeat(70));

if (passed < TEST_CASES.length) {
  process.exit(1);
} else {
  process.exit(0);
}
