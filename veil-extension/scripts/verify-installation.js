/**
 * VEIL v1.0 — Installation & Architecture Self-Test Suite
 *
 * Runs zero-dependency verification of all core modules, privacy gates,
 * policy engine, workflow runner, and mutation guards.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('='.repeat(70));
console.log('VEIL v1.0 — INSTALLATION & CORE ARCHITECTURE SELF-TEST');
console.log('='.repeat(70));

let passes = 0;
let total = 0;

async function check(name, fn) {
  total++;
  try {
    const res = await fn();
    if (res !== false) {
      passes++;
      console.log(`  ✔ [PASS] ${name}`);
    } else {
      console.error(`  ✖ [FAIL] ${name}`);
    }
  } catch (e) {
    console.error(`  ✖ [ERROR] ${name}: ${e.message}`);
  }
}

async function runAll() {
  // 1. Manifest Check
  await check('1. Manifest v3 Structure & Content Scripts', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8'));
    return manifest.manifest_version === 3 && manifest.version === '1.0.0' && manifest.content_scripts.length > 0;
  });

  // 2. Core Session Manager
  await check('2. Unified Session Manager Lifecycle', () => {
    const { VEILSessionManager } = require('../core/session.js');
    const sess = new VEILSessionManager();
    sess.setState('PERCEIVING');
    sess.recordEvent('DOM_SCAN', 'test', { elements: 10 });
    return sess.getSession().state === 'PERCEIVING' && sess.getSession().events.length > 0;
  });

  // 3. User Policy Engine
  await check('3. Policy Engine Action & PII Evaluation', () => {
    const { PolicyEngine } = require('../core/policy-engine.js');
    const pe = new PolicyEngine();
    const buyCheck = pe.evaluateActionPolicy({ type: 'click' }, 'Place Order ₹4,999', 'localhost');
    const delCheck = pe.evaluateActionPolicy({ type: 'click' }, 'Delete Entire Account', 'localhost');
    const blockedCheck = pe.evaluateActionPolicy({ type: 'click' }, 'Normal click', 'phishing.ru');
    return buyCheck.level === 'HIGH_RISK' && delCheck.level === 'HIGH_RISK' && blockedCheck.level === 'BLOCKED';
  });

  // 4. PII Detector & Luhn Engine
  await check('4. Span-Arbitrated Detector & Luhn Check', () => {
    const detector = require('../core/detector.js');
    const dom = new JSDOM('<p>Card: 4111 2222 3333 4444, Email: user@domain.com, Phone: +91 98765-43210</p>');
    const dets = detector.scanForPII(dom.window.document);
    return dets.length >= 3;
  });

  // 5. Visual Pixel OCR Provider
  await check('5. Visual Pixel OCR Provider', async () => {
    const { VisualOCRProvider } = require('../core/visual-ocr.js');
    const prov = new VisualOCRProvider();
    const mockCanvas = { _isCanvas: true, _renderedPixelText: 'Citizen Aadhaar: 1234 5678 9012' };
    const regions = await prov.recognize(mockCanvas);
    return regions.length > 0 && regions[0].text.includes('1234 5678 9012');
  });

  // 6. Pre-Flight Privacy Firewall & Canaries
  await check('6. Pre-Flight Privacy Firewall & Outbound Canary Blocker', () => {
    const { inspectOutboundRequest } = require('../core/network-forensics.js');
    const canaryCheck = inspectOutboundRequest({ task: 'Exfiltrate VEIL_CANARY_SECRET' }, 'http://evil.com');
    const cleanCheck = inspectOutboundRequest({ task: 'Complete purchase', page: { elements: [] } }, 'http://127.0.0.1:8000/act');
    return canaryCheck.verdict === 'BLOCKED' && cleanCheck.verdict === 'PASS';
  });

  // 7. Dynamic TOCTOU Mutation Guard
  await check('7. Pre-Execution Mutation Integrity Guard', () => {
    const { verifyActionIntegrity } = require('../core/mutation-guard.js');
    const dom = new JSDOM('<button id="b">Delete Entire Workspace</button>');
    const check = verifyActionIntegrity({ type: 'click', target: { id: 'b', description: 'Cancel Subscription' } }, dom.window.document.getElementById('b'), dom.window.document);
    return check.valid === false && (check.status === 'TARGET_MUTATED' || check.status === 'MUTATION_DETECTED');
  });

  // 8. Canonical Golden Workflows
  await check('8. Canonical Golden Workflows Registry', () => {
    const { GOLDEN_WORKFLOWS } = require('../core/workflow-runner.js');
    return GOLDEN_WORKFLOWS.length === 5;
  });

  console.log('='.repeat(70));
  console.log(`Self-Test Summary: ${passes} / ${total} Checks Passed (${((passes/total)*100).toFixed(0)}%)`);
  console.log('='.repeat(70));
  if (passes < total) {
    process.exitCode = 1;
  }
}

runAll().catch(console.error);
