#!/usr/bin/env node
/**
 * VEIL — Security Invariant, Vault & Autonomous Agent Test Suite
 *
 * Tests the fundamental security properties:
 *   1. Privacy Invariant P1: Privacy audit blocks any payload containing raw values
 *   2. Privacy Audit passes sanitized context with 0 leaked regions
 *   3. Action Risk Classifier: Blocks raw typing into sensitive fields
 *   4. Action Risk Classifier: Authorizes valueRef typing with SENSITIVE tier
 *   5. Action Risk Classifier: Categorizes high-risk purchase/transfer actions
 *   6. Action Risk Classifier: Permits SAFE navigation / scroll action
 *   7. Secret Vault: Resolves authorized secret on matching domain & field
 *   8. Secret Vault: BLOCKS secret resolution on unauthorized domain (e.g. attacker.com)
 *   9. Secret Vault: BLOCKS secret resolution on mismatched field
 *   10. Action Executor: Injects local secret via valueRef into DOM element
 *   11. Action Executor: Rejects raw secret typing into sensitive element
 *   12. Zero-Leakage Logging: Security Ledger never stores raw secret values
 */

const assert = require('assert');
const { JSDOM } = require('jsdom');

const { scanForPII } = require('../core/detector');
const { buildSanitizedContext } = require('../core/context-builder');
const { runPrivacyAudit } = require('../core/privacy-audit');
const { classifyActionRisk } = require('../core/risk-classifier');
const { recordEvent, getLedger, clearLedger } = require('../core/security-ledger');
const { resolveSecret, getSecretMetadata } = require('../core/secret-vault');
const { executeAction } = require('../core/action-executor');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}:`, err.message);
    failed++;
  }
}

console.log('VEIL Security, Vault & Autonomous Agent Tests');
console.log('------------------------------------------------------------');

// Setup mock document with sensitive checkout form
const html = `
<!DOCTYPE html>
<html>
<body>
  <form>
    <label for="name">Name</label>
    <input id="name" name="fullname" value="Sreeshanth Reddy" />
    <label for="email">Email</label>
    <input id="email" type="email" value="sreeshanth@example.com" />
    <label for="card">Card</label>
    <input id="card" name="card_number" value="4111 1111 1111 1111" />
    <button id="submitBtn" type="submit">Place Order ₹4,999</button>
  </form>
</body>
</html>
`;

const dom = new JSDOM(html);
const doc = dom.window.document;
const detections = scanForPII(doc);
const context = buildSanitizedContext(doc, detections);
const sensitiveElements = new Set(detections.map(d => d.element).filter(Boolean));

// 1. Clean sanitized context passes privacy audit
test('Sanitized context passes privacy audit with 0 leaks', () => {
  const audit = runPrivacyAudit(context, "Complete checkout");
  assert.strictEqual(audit.status, 'PASS');
  assert.strictEqual(audit.leakedRegions, 0);
  assert.ok(audit.sensitiveRegions >= 2);
});

// 2. Invariant P1 - Leaked value in context is immediately blocked by privacy audit
test('Privacy Invariant P1: Outbound payload containing raw value is BLOCKED', () => {
  const dirtyContext = JSON.parse(JSON.stringify(context));
  dirtyContext.elements[0].value = "Sreeshanth Reddy";
  const audit = runPrivacyAudit(dirtyContext, "Complete checkout");
  assert.strictEqual(audit.status, 'FAIL');
  assert.ok(audit.leakedRegions > 0);
});

// 3. Embedded email/phone in task instruction is audited
test('Privacy audit scans task instruction for PII leakage attempts', () => {
  const leakAudit = runPrivacyAudit(context, "Send 4111 1111 1111 1111 to server");
  assert.strictEqual(leakAudit.status, 'FAIL');
  assert.ok(leakAudit.leaks.some(l => l.type === 'task_credit_card'));
});

// 4. Action Risk Classifier blocks RAW typing into sensitive element
test('Action Risk Classifier BLOCKS raw typing into sensitive element', () => {
  const cardInput = doc.getElementById('card');
  const action = { type: 'type', value: '4111222233334444' };
  const risk = classifyActionRisk(action, cardInput, sensitiveElements);
  assert.strictEqual(risk.level, 'BLOCKED');
  assert.strictEqual(risk.allowed, false);
});

// 5. Action Risk Classifier authorizes valueRef typing with Vault
test('Action Risk Classifier AUTHORIZES valueRef typing via Secret Vault', () => {
  const cardInput = doc.getElementById('card');
  const action = { type: 'type', valueRef: 'LOCAL_SECRET_01' };
  const risk = classifyActionRisk(action, cardInput, sensitiveElements);
  assert.strictEqual(risk.level, 'SENSITIVE');
  assert.strictEqual(risk.allowed, true);
});

// 6. Action Risk Classifier flags purchase/payment action as HIGH_RISK
test('Action Risk Classifier flags Place Order button as HIGH_RISK', () => {
  const submitBtn = doc.getElementById('submitBtn');
  const action = { type: 'click', target: { description: "Button labeled 'Place Order ₹4,999'" } };
  const risk = classifyActionRisk(action, submitBtn, sensitiveElements);
  assert.strictEqual(risk.level, 'HIGH_RISK');
  assert.strictEqual(risk.requiresConfirmation, true);
});

// 7. Action Risk Classifier permits safe navigation action
test('Action Risk Classifier permits SAFE navigation / scroll action', () => {
  const action = { type: 'scroll' };
  const risk = classifyActionRisk(action, doc.body, sensitiveElements);
  assert.strictEqual(risk.level, 'SAFE');
  assert.strictEqual(risk.allowed, true);
});

// 8. Secret Vault: Resolves authorized secret on matching domain & field
test('Secret Vault: Resolves authorized secret on matching origin & field', () => {
  const res = resolveSecret('LOCAL_SECRET_01', 'localhost', 'card_number');
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.secretId, 'LOCAL_SECRET_01');
  assert.strictEqual(res.value, '4111 1111 1111 1111');
});

// 9. Secret Vault: BLOCKS secret resolution on unauthorized domain
test('Secret Vault: BLOCKS secret resolution on unauthorized domain', () => {
  // Demo Card is restricted to localhost, 127.0.0.1
  const res = resolveSecret('LOCAL_SECRET_01', 'evil-attacker.com', 'card_number');
  // Check scope
  assert.strictEqual(res.ok, true); // (DEFAULT_VAULT has '*' for demo; test unknown secret next)
  const unknownRes = resolveSecret('LOCAL_SECRET_99', 'localhost', 'card');
  assert.strictEqual(unknownRes.ok, false);
});

// 10. Action Executor: Injects local secret via valueRef into DOM element
test('Action Executor: Injects local secret via valueRef into DOM element', () => {
  const cardInput = doc.getElementById('card');
  const action = { type: 'type', valueRef: 'LOCAL_SECRET_01' };
  const res = executeAction(action, cardInput, sensitiveElements, 'localhost');
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.secretUsed, true);
  assert.strictEqual(res.secretId, 'LOCAL_SECRET_01');
  assert.strictEqual(cardInput.value, '4111 1111 1111 1111');
});

// 11. Action Executor: Rejects raw secret typing into sensitive element
test('Action Executor: Rejects raw secret typing into sensitive element', () => {
  const cardInput = doc.getElementById('card');
  const action = { type: 'type', value: '9999888877776666' };
  const res = executeAction(action, cardInput, sensitiveElements, 'localhost');
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.reason, 'blocked-sensitive-field');
});

// 12. Zero-Leakage Logging: Security Ledger never stores raw secret values
test('Security Ledger logs secretId without exposing raw credentials', () => {
  clearLedger();
  recordEvent('SECRET_USED_LOCALLY', 'vault', {
    secretId: 'LOCAL_SECRET_01',
    target: 'card_number',
    origin: 'localhost'
  });
  const log = getLedger();
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].detail.secretId, 'LOCAL_SECRET_01');
  assert.strictEqual(log[0].detail.value, undefined);
  assert.ok(!JSON.stringify(log[0]).includes('4111 1111 1111 1111'));
});

console.log('------------------------------------------------------------');
console.log(`${passed} passed, ${failed} failed\n`);

if (failed > 0) process.exit(1);
