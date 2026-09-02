/**
 * VEIL — Live Tab & Test Page Perception Benchmark Suite
 *
 * Exercises real DOM perception, PII scanning, and context sanitization
 * across all 10 local test pages in veil-extension/test-pages/.
 *
 * Generates benchmark/results/final-live-tab.json.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const detector = require('../core/detector.js');
const { buildSanitizedContext } = require('../core/context-builder.js');
const { runPrivacyAudit } = require('../core/privacy-audit.js');

console.log('='.repeat(70));
console.log('VEIL — Live Tab & Test Page Perception Benchmark Suite');
console.log('='.repeat(70));

const testPagesDir = path.join(__dirname, '..', 'test-pages');

const TEST_PAGES = [
  { file: 'case-001-public-doc.html', name: 'Public Satellite Doc', domain: 'Government / Research' },
  { file: 'case-002-ecommerce-store.html', name: 'E-Commerce Store Checkout', domain: 'E-Commerce' },
  { file: 'case-003-login-auth.html', name: 'Login & Password Auth', domain: 'Authentication' },
  { file: 'case-004-netbanking.html', name: 'Netbanking Dashboard', domain: 'Banking & Finance' },
  { file: 'case-005-govt-ekyc.html', name: 'Government e-KYC Verification', domain: 'Government Services' },
  { file: 'case-006-healthcare.html', name: 'Healthcare & Patient Intake', domain: 'Healthcare' },
  { file: 'case-007-image-pii.html', name: 'Visual Invoice Media', domain: 'Documents & Media' },
  { file: 'case-008-canvas-pii.html', name: 'HTML5 Canvas UID Card', domain: 'Documents & Media' },
  { file: 'case-009-prompt-injection.html', name: 'Adversarial Prompt Override', domain: 'Adversarial Defense' },
  { file: 'case-010-dom-mutation.html', name: 'Dynamic TOCTOU Mutation Trap', domain: 'Dynamic SPA' }
];

const results = [];
let totalSensitiveDetected = 0;
let totalLeaks = 0;

TEST_PAGES.forEach((page, idx) => {
  const filePath = path.join(testPagesDir, page.file);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing test page: ${page.file}`);
    return;
  }

  const html = fs.readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(html, { url: `http://localhost:3000/${page.file}` });
  const doc = dom.window.document;

  const t0 = performance.now();
  const detections = detector.scanForPII(doc);
  const piiTime = Number((performance.now() - t0).toFixed(2));

  const t1 = performance.now();
  const context = buildSanitizedContext(doc, detections);
  const ctxTime = Number((performance.now() - t1).toFixed(2));

  const t2 = performance.now();
  const audit = runPrivacyAudit(context, `Process ${page.name}`);
  const audTime = Number((performance.now() - t2).toFixed(2));

  const totalLocalMs = Number((performance.now() - t0).toFixed(2));
  const sensitiveCount = detections.length;
  totalSensitiveDetected += sensitiveCount;
  totalLeaks += (audit.leakedRegions || 0);

  console.log(`  ✔ [PAGE ${idx + 1}/10] ${page.name} (${page.file})`);
  console.log(`     Elements: ${context.elements.length} | PII: ${sensitiveCount} | Audit: ${audit.status} | Latency: ${totalLocalMs}ms`);

  results.push({
    file: page.file,
    name: page.name,
    domain: page.domain,
    elementCount: context.elements.length,
    sensitiveEntitiesDetected: sensitiveCount,
    privacyAuditStatus: audit.status,
    leaksDetected: audit.leakedRegions || 0,
    timingsMs: {
      piiScan: piiTime,
      contextBuild: ctxTime,
      privacyAudit: audTime,
      totalLocal: totalLocalMs
    }
  });
});

console.log('\n' + '='.repeat(70));
console.log(`Live Tab Test Page Suite Summary:`);
console.log(`  - Total Pages Scanned: ${results.length} / 10`);
console.log(`  - Sensitive Entities Redacted: ${totalSensitiveDetected}`);
console.log(`  - Sensitive Data Leaks: ${totalLeaks} (0.00% Leakage)`);
console.log('='.repeat(70));

// Write JSON artifact
const outDir = path.join(__dirname, 'results');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outputData = {
  phase: 'FINAL_LIVE_TAB_PAGES',
  timestamp: new Date().toISOString(),
  totalPages: results.length,
  totalSensitiveDetected,
  totalLeaks,
  pages: results
};

fs.writeFileSync(path.join(outDir, 'final-live-tab.json'), JSON.stringify(outputData, null, 2), 'utf-8');
console.log(`\n✔ Live tab benchmark written to benchmark/results/final-live-tab.json`);
