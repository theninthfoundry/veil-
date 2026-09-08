/**
 * Invariant I3: Capability-Authorized Execution & Replay Immunity
 *
 * Formal Rule:
 *   Execute(action) ⟹ ∃ c ∈ Capabilities : Valid(c, action) ∧ AtomicConsume(c)
 *
 * "No capability ⟹ No action.
 *  Replayed capability ⟹ Rejection.
 *  Expired capability ⟹ Rejection."
 */

const capMgr = require('../capability-manager');

function verifyInvariantI3() {
  const evidence = {
    id: 'I3-capability-execution',
    name: 'Capability Execution & Replay Immunity',
    formalTheorem: 'Execute(a) ⟹ ∃ c : Valid(c) ∧ SingleUse(c)',
    testsRun: 0,
    passed: 0,
    failed: 0,
    traces: []
  };

  // Test 3.1: Valid Capability Issuance & Verification
  evidence.testsRun++;
  const cap = capMgr.issueCapability({
    actionType: 'CLICK',
    targetFingerprint: 'btn:submit:order',
    origin: 'shop.example',
    stateHash: 'state_hash_001',
    ttlMs: 5000
  });

  const verify1 = capMgr.verifyCapability(cap.capabilityId, {
    origin: 'shop.example',
    actionType: 'CLICK',
    targetFingerprint: 'btn:submit:order',
    stateHash: 'state_hash_001'
  });

  if (verify1.valid) {
    evidence.passed++;
    evidence.traces.push('Valid capability authorized successfully');
  } else {
    evidence.failed++;
    evidence.traces.push('FAIL: Legitimate capability verification failed');
  }

  // Test 3.2: Atomic Consumption & Single-Use Replay Protection
  evidence.testsRun++;
  const consume1 = capMgr.consumeCapability(cap.capabilityId, {
    origin: 'shop.example',
    actionType: 'CLICK',
    targetFingerprint: 'btn:submit:order',
    stateHash: 'state_hash_001'
  });

  const replayAttempt = capMgr.consumeCapability(cap.capabilityId, {
    origin: 'shop.example',
    actionType: 'CLICK',
    targetFingerprint: 'btn:submit:order',
    stateHash: 'state_hash_001'
  });

  if (consume1.ok && !replayAttempt.ok && replayAttempt.reason.includes('already consumed')) {
    evidence.passed++;
    evidence.traces.push('Replay attack successfully thwarted: capability is strictly single-use');
  } else {
    evidence.failed++;
    evidence.traces.push('FAIL: Replay attack succeeded');
  }

  // Test 3.3: Attenuation Scope Violation Rejection
  evidence.testsRun++;
  const attenuatedCap = capMgr.issueCapability({
    actionType: 'CLICK',
    targetFingerprint: 'button:add_to_cart',
    origin: 'shop.example',
    stateHash: 'state_hash_001',
    attenuation: capMgr.ATTENUATION_SCOPES.ELEMENT
  });

  const scopeViolation = capMgr.verifyCapability(attenuatedCap.capabilityId, {
    origin: 'shop.example',
    actionType: 'CLICK',
    targetFingerprint: 'button:checkout_final', // Different target
    stateHash: 'state_hash_001'
  });

  if (!scopeViolation.valid && scopeViolation.reason.includes('Target fingerprint mismatch')) {
    evidence.passed++;
    evidence.traces.push('Attenuation scope violation strictly rejected');
  } else {
    evidence.failed++;
    evidence.traces.push('FAIL: Attenuation scope violation permitted');
  }

  evidence.certified = evidence.failed === 0;
  return evidence;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { verifyInvariantI3 };
}
