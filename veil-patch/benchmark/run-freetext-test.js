/**
 * VEIL — Phase E Free-Text Contextual PII & Hard Negatives Benchmark
 *
 * Tests 22 difficult free-text cases across paragraphs, cards, tooltips, and tables,
 * rigorously evaluating true positive detection and false positive rejection on hard negatives
 * (Invoice IDs, Product SKUs, Dates, Prices, Timestamps, Flight Codes).
 *
 * Generates benchmark/results/pii.json.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const detector = require('../core/detector.js');

console.log('='.repeat(70));
console.log('VEIL — Phase E: Free-Text Contextual PII & Hard Negatives Suite');
console.log('='.repeat(70));

const CASES = [
  // --- Positives (True PII in Paragraphs/Cards/Tables) ---
  {
    id: 'ft-01-paragraph-email',
    text: 'Please send your resume directly to hr-talent@deeptech.ai for consideration.',
    expectedTypes: ['email'],
    isPositive: true
  },
  {
    id: 'ft-02-paragraph-phone-intl',
    text: 'For emergency technical escalation, reach our director at +91 98765-43210 immediately.',
    expectedTypes: ['phone'],
    isPositive: true
  },
  {
    id: 'ft-03-table-aadhaar',
    text: 'Resident UID: 4567 8901 2345 (Verified by UIDAI on 15-Aug-2026)',
    expectedTypes: ['aadhaar'],
    isPositive: true
  },
  {
    id: 'ft-04-card-pan',
    text: 'Taxpayer Profile: Sreeshanth Rao, Permanent Account Number ABCDE1234F registered.',
    expectedTypes: ['pan'],
    isPositive: true
  },
  {
    id: 'ft-05-body-luhn-creditcard',
    text: 'The payment of ₹4,999 was processed on MasterCard 5555 5555 5555 4444 successfully.',
    expectedTypes: ['credit_card'],
    isPositive: true
  },
  {
    id: 'ft-06-support-tollfree',
    text: 'National Citizen Grievance Helpline is accessible at 1800-200-3344 round the clock.',
    expectedTypes: ['phone'],
    isPositive: true
  },
  {
    id: 'ft-07-us-phone-format',
    text: 'Our North America office representative can be contacted at (555) 234-5678.',
    expectedTypes: ['phone'],
    isPositive: true
  },
  {
    id: 'ft-08-mixed-patient-notes',
    text: 'Patient contact: patient.john@hospital.org / +91 91234 56789 / Aadhaar: 1234 5678 9012',
    expectedTypes: ['email', 'phone', 'aadhaar'],
    isPositive: true
  },
  {
    id: 'ft-09-multi-email-list',
    text: 'Copy: admin@isro.gov.in, security-lead@defence.res.in, auditor@cert-in.org.in',
    expectedTypes: ['email'],
    isPositive: true
  },
  {
    id: 'ft-10-visa-card-paragraph',
    text: 'Corporate expense billing account 4111 1111 1111 1111 active for travel allowances.',
    expectedTypes: ['credit_card'],
    isPositive: true
  },

  // --- Hard Negatives (Non-PII That Must NOT Trigger False Positives) ---
  {
    id: 'ft-11-hard-negative-invoice',
    text: 'Order Confirmation: Invoice reference INV-2026-19382 generated for Q2.',
    expectedTypes: [],
    isPositive: false
  },
  {
    id: 'ft-12-hard-negative-sku',
    text: 'Product Catalog Item SKU: PHONE-XR-128 (Space Gray, 128GB Storage).',
    expectedTypes: [],
    isPositive: false
  },
  {
    id: 'ft-13-hard-negative-currency-price',
    text: 'Total Amount Payable: ₹4,999.00 (Inclusive of 18% GST: ₹899.82).',
    expectedTypes: [],
    isPositive: false
  },
  {
    id: 'ft-14-hard-negative-date-timestamp',
    text: 'Flight departure scheduled on 12/04/2026 at 18:45:00 UTC from Terminal 3.',
    expectedTypes: [],
    isPositive: false
  },
  {
    id: 'ft-15-hard-negative-random-number',
    text: 'Batch serial tracking verification hash: 928374 (Status: In-Transit).',
    expectedTypes: [],
    isPositive: false
  },
  {
    id: 'ft-16-hard-negative-flight-code',
    text: 'Passenger booked on Air India flight AI-805 from New Delhi (DEL) to Bengaluru (BLR).',
    expectedTypes: [],
    isPositive: false
  },
  {
    id: 'ft-17-hard-negative-transaction-ref',
    text: 'Transaction Reference: TXN_9876543210 settled via NEFT gateway.',
    expectedTypes: [],
    isPositive: false
  },
  {
    id: 'ft-18-hard-negative-gstin-tax',
    text: 'Company GSTIN Registration Number: 29AAAAA0000A1Z5 (Karnataka jurisdiction).',
    expectedTypes: [],
    isPositive: false
  },
  {
    id: 'ft-19-hard-negative-patent-code',
    text: 'Autonomous Perception System — Patent Application US-2026-0049281-A1.',
    expectedTypes: [],
    isPositive: false
  },
  {
    id: 'ft-20-hard-negative-http-url',
    text: 'Browse documentation at https://api.veil-firewall.internal:8080/v1/metrics.',
    expectedTypes: [],
    isPositive: false
  },
  {
    id: 'ft-21-hard-negative-mac-address',
    text: 'Network adapter interface hardware MAC: 00:1A:2B:3C:4D:5E on eth0.',
    expectedTypes: [],
    isPositive: false
  },
  {
    id: 'ft-22-hard-negative-css-dimensions',
    text: 'Viewport dimensions: 1920x1080 resolution with 144Hz refresh rate.',
    expectedTypes: [],
    isPositive: false
  }
];

let tp = 0; // True Positive: Expected PII and detected
let fp = 0; // False Positive: Non-PII detected as PII
let fn = 0; // False Negative: Expected PII but missed
let tn = 0; // True Negative: Non-PII and correctly ignored

const results = [];

for (const c of CASES) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body><p id="target-para">${c.text}</p></body></html>`);
  const doc = dom.window.document;
  
  const detections = detector.scanForPII(doc);
  const detectedTypes = [...new Set(detections.map(d => d.type))];

  let casePassed = false;

  if (c.isPositive) {
    // Check if expected types were detected
    const missing = c.expectedTypes.filter(t => !detectedTypes.includes(t));
    if (missing.length === 0) {
      tp += c.expectedTypes.length;
      casePassed = true;
    } else {
      fn += missing.length;
      tp += (c.expectedTypes.length - missing.length);
    }
  } else {
    // Negative test: should have 0 detections
    if (detectedTypes.length === 0) {
      tn += 1;
      casePassed = true;
    } else {
      fp += detectedTypes.length;
    }
  }

  console.log(`  ${casePassed ? '✔ [PASS]' : '✖ [FAIL]'} ${c.id} (${c.isPositive ? 'PII Positive' : 'Hard Negative'}): ${c.text.slice(0, 50)}...`);

  results.push({
    caseId: c.id,
    isPositive: c.isPositive,
    textSnippet: c.text,
    expectedTypes: c.expectedTypes,
    detectedTypes,
    pass: casePassed
  });
}

const precision = tp + fp > 0 ? ((tp / (tp + fp)) * 100).toFixed(1) : '100.0';
const recall = tp + fn > 0 ? ((tp / (tp + fn)) * 100).toFixed(1) : '100.0';
const pNum = parseFloat(precision) / 100;
const rNum = parseFloat(recall) / 100;
const f1 = (pNum + rNum > 0) ? (((2 * pNum * rNum) / (pNum + rNum)) * 100).toFixed(1) : '100.0';

console.log('\n' + '='.repeat(70));
console.log(`Free-Text & Hard Negatives Evaluation Metrics:`);
console.log(`  - True Positives: ${tp}`);
console.log(`  - True Negatives: ${tn}`);
console.log(`  - False Positives: ${fp}`);
console.log(`  - False Negatives: ${fn}`);
console.log(`  - Precision: ${precision}%`);
console.log(`  - Recall: ${recall}%`);
console.log(`  - F1 Score: ${f1}%`);
console.log('='.repeat(70));

// Write JSON artifact
const outDir = path.join(__dirname, 'results');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outputData = {
  phase: 'PHASE_E_FREE_TEXT_CONTEXTUAL_PII',
  timestamp: new Date().toISOString(),
  totalCases: CASES.length,
  positivesTested: CASES.filter(c => c.isPositive).length,
  hardNegativesTested: CASES.filter(c => !c.isPositive).length,
  metrics: {
    truePositives: tp,
    trueNegatives: tn,
    falsePositives: fp,
    falseNegatives: fn,
    precision: `${precision}%`,
    recall: `${recall}%`,
    f1Score: `${f1}%`
  },
  cases: results
};

fs.writeFileSync(path.join(outDir, 'pii.json'), JSON.stringify(outputData, null, 2), 'utf-8');
console.log(`\n✔ Free-text PII evidence written to benchmark/results/pii.json`);
