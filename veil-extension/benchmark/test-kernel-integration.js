/**
 * VEIL v2.0 — Zero-Trust Security Kernel Master Integration Suite
 *
 * Verifies end-to-end enforcement of the 8 Security Invariants:
 *   I1: Zero Direct Side-Effects (Capability-authorized)
 *   I2: Privileged Authorization
 *   I3: Cryptographic State-Binding (stateHash)
 *   I4: Zero-Copy Secret References (VEIL-IR / ValueRef)
 *   I5: Purpose-Bound Sensitive Data
 *   I6: Contextual Sensitivity
 *   I7: Transactional Execution
 *   I8: Tamper-Evident SHA-256 Hash Chaining
 */

const assert = require('assert');
const { JSDOM } = require('jsdom');

const ledger = require('../core/security-ledger');
const stateHasher = require('../core/state-hasher');
const capMgr = require('../core/capability-manager');
const policyEngine = require('../core/policy-engine');
const resolver = require('../core/action-resolver');
const executor = require('../core/action-executor');
const veilIR = require('../core/veil-ir');
const mutationGuard = require('../core/mutation-guard');

console.log('='.repeat(75));
console.log('🛡️  VEIL v2.0 — ZERO-TRUST SECURITY KERNEL INTEGRATION SUITE');
console.log('='.repeat(75));

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

// Reset ledger for clean test
ledger.clearLedger();

const html = `
<!DOCTYPE html>
<html>
<head><title>Nexus Store Checkout</title></head>
<body>
  <div id="checkout-container">
    <h2>Secure Checkout</h2>
    <div class="summary">Total Due: ₹4,999</div>
    <form id="pay-form" action="/process-payment" method="POST">
      <label for="cc-field">Credit Card Number</label>
      <input id="cc-field" name="card_number" type="text" placeholder="1234 5678 9012 3456" />

      <label for="cvv-field">CVV Security Code</label>
      <input id="cvv-field" name="cvv" type="password" placeholder="123" />

      <button id="pay-button" type="submit" aria-label="Confirm Purchase of ₹4,999">Pay ₹4,999</button>
    </form>
  </div>
</body>
</html>
`;

const dom = new JSDOM(html, { url: 'https://shop.example.com/checkout' });
const doc = dom.window.document;

// --- TEST 1: Perception & Canonical DOM State Hashing ---
let initialHash = null;
test('1. Canonical DOM State Hashing & Determinism (Invariant I3)', () => {
  const { stateHash, elementCount } = stateHasher.computeStateHash(doc);
  assert.strictEqual(typeof stateHash, 'string');
  assert.strictEqual(stateHash.length, 64);
  assert(elementCount >= 3);
  initialHash = stateHash;

  // Verify determinism
  const secondPass = stateHasher.computeStateHash(doc);
  assert.strictEqual(stateHash, secondPass.stateHash);
});

// --- TEST 2: Formal VEIL-IR AST Compilation & Invariant P1 ---
let irPayload = null;
test('2. VEIL-IR AST Compilation with Zero Value Leaks (Invariant I4 & P1)', () => {
  irPayload = veilIR.compileVeilIR(doc, [
    { element: doc.getElementById('cc-field'), type: 'credit_card' },
    { element: doc.getElementById('cvv-field'), type: 'cvv' }
  ], { origin: 'https://shop.example.com' });

  assert(irPayload.schema === 'veil.ir/v1' || irPayload.schema === 'veil.ir/v2');
  assert.strictEqual(irPayload.stateHash, initialHash);
  assert(irPayload.elements.length >= 3);

  const validation = veilIR.validateIR(irPayload);
  assert.strictEqual(validation.valid, true);

  // Assert sensitive fields labeled, but values strictly absent
  const cardEl = irPayload.elements.find(e => e.id === 'cc-field');
  assert.strictEqual(cardEl.sensitivity, 'SECRET');
  assert.strictEqual('value' in cardEl, false);
});

// --- TEST 3: Layered Evidence-Based Action Resolution ---
let targetButton = null;
test('3. Layered Evidence Target Resolution (Bayesian Scorer)', () => {
  const evidenceRes = resolver.resolveTargetWithEvidence({
    description: 'Pay ₹4,999',
    role: 'button'
  }, doc);

  assert(evidenceRes.element !== null);
  assert.strictEqual(evidenceRes.element.id, 'pay-button');
  assert(evidenceRes.score >= 0.50);
  assert(evidenceRes.confidence === 'HIGH' || evidenceRes.confidence === 'MEDIUM');
  targetButton = evidenceRes.element;
});

// --- TEST 4: Unified Policy Decision Point (PDP) ---
let policyDecision = null;
test('4. Unified PDP High-Risk Classification', () => {
  policyDecision = policyEngine.decideAction({
    action: { type: 'click', target: { description: 'Pay ₹4,999' } },
    targetElement: targetButton,
    origin: 'https://shop.example.com'
  });

  assert.strictEqual(policyDecision.riskLevel, 'HIGH_RISK');
  assert.strictEqual(policyDecision.decision, 'REQUIRE_HUMAN');
  assert.strictEqual(policyDecision.requiresHuman, true);
  assert.strictEqual(policyDecision.allowed, false);
});

// --- TEST 5: Action Capability Issuance & Cryptographic Signature ---
let capabilityToken = null;
test('5. Action Capability Issuance & Signature Verification (Invariant I1)', () => {
  const targetFp = stateHasher.computeElementFingerprint(targetButton);
  capabilityToken = capMgr.issueCapability({
    actionType: 'CLICK',
    targetFingerprint: targetFp,
    origin: 'https://shop.example.com',
    stateHash: initialHash,
    purpose: 'checkout_purchase',
    ttlMs: 10000
  });

  assert(capabilityToken.capabilityId.startsWith('cap_'));
  assert.strictEqual(capabilityToken.consumed, false);
  assert.strictEqual(capabilityToken.stateHash, initialHash);

  const verify = capMgr.verifyCapability(capabilityToken.capabilityId, {
    origin: 'https://shop.example.com',
    stateHash: initialHash,
    actionType: 'CLICK',
    targetFingerprint: targetFp
  });

  assert.strictEqual(verify.valid, true);
});

// --- TEST 6: Adversarial Mutation & Price Swap Block (Invariant I3) ---
test('6. Mutation & Price Swap Pre-Execution Rejection (TOCTOU Defense)', () => {
  // Simulate attacker altering price from ₹4,999 to ₹49,999 after capability was issued
  targetButton.textContent = 'Pay ₹49,999';

  const mutationResult = mutationGuard.verifyActionIntegrity(
    { type: 'click', target: { description: 'Pay ₹4,999' } },
    targetButton,
    doc,
    { expectedStateHash: initialHash, expectedOrigin: 'https://shop.example.com' }
  );

  assert.strictEqual(mutationResult.ok, false);
  assert(mutationResult.status === 'STATE_MUTATED' || mutationResult.status === 'TARGET_MUTATED');
  console.log(`    ↳ Defense triggered: ${mutationResult.reason}`);

  // Revert DOM back to legitimate state for execution test
  targetButton.textContent = 'Pay ₹4,999';
});

// --- TEST 7: Atomic Capability Consumption & DOM Dispatch ---
test('7. Atomic Capability Consumption & Native DOM Dispatch (Invariant I1 & I7)', () => {
  const targetFp = stateHasher.computeElementFingerprint(targetButton);

  const execRes = executor.executeAction({
    type: 'click',
    capabilityId: capabilityToken.capabilityId,
    stateHash: initialHash
  }, targetButton, new Set(), 'https://shop.example.com');

  assert.strictEqual(execRes.ok, true);
  assert.strictEqual(execRes.capabilityConsumed, true);

  // Attempt replay attack with same capabilityId
  const replayRes = executor.executeAction({
    type: 'click',
    capabilityId: capabilityToken.capabilityId,
    stateHash: initialHash
  }, targetButton, new Set(), 'https://shop.example.com');

  assert.strictEqual(replayRes.ok, false);
  assert(replayRes.reason.includes('capability-denied') || replayRes.reason.includes('already consumed'));
});

// --- TEST 8: Cryptographic Ledger Chain Verification ---
test('8. Cryptographic SHA-256 Ledger Chain Verification (Invariant I8)', () => {
  const status = ledger.verifyChainIntegrity();
  assert.strictEqual(status.valid, true);
  assert(status.length >= 3);
  assert.strictEqual(typeof status.headHash, 'string');
  assert.strictEqual(status.headHash.length, 64);
  console.log(`    ↳ Verified ${status.length} chained events. Final HeadHash: ${status.headHash.slice(0, 16)}...`);
});

console.log('='.repeat(75));
console.log(`🎉 ALL ${passed}/${total} SECURITY KERNEL INTEGRATION TESTS PASSED!`);
console.log('='.repeat(75) + '\n');
