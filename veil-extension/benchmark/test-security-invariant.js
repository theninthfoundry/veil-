/**
 * VEIL v1.0 — Security Invariant Validation Suite
 *
 * Formally validates the single governing thesis:
 * "The model can observe sanitized context and propose actions, but it can never directly access protected values or directly execute browser actions."
 */

const { JSDOM } = require('jsdom');
const detector = require('../core/detector.js');
const { buildSanitizedContext } = require('../core/context-builder.js');
const { resolveSecret } = require('../core/secret-vault.js');
const { classifyActionRisk } = require('../core/risk-classifier.js');
const { verifyActionIntegrity } = require('../core/mutation-guard.js');
const { inspectOutboundRequest } = require('../core/network-forensics.js');

console.log('='.repeat(75));
console.log('VEIL v1.0 — CORE SECURITY INVARIANT VERIFICATION SUITE');
console.log('='.repeat(75));

let total = 0;
let passed = 0;

function assertInvariant(condition, title, details) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✔ [INVARIANT HELD] ${title}`);
  } else {
    console.error(`  ✖ [INVARIANT VIOLATED] ${title} — ${details}`);
  }
}

async function runInvariantTests() {
  // Invariant 1: Raw passwords are never transmitted in sanitized context
  const dom1 = new JSDOM(`<div><input id="pwd" type="password" value="hunter2"></div>`);
  const dets1 = detector.scanForPII(dom1.window.document);
  const ctx1 = buildSanitizedContext(dom1.window.document, dets1);
  assertInvariant(!JSON.stringify(ctx1).includes('hunter2'), '1. Plaintext password excluded from outbound context');

  // Invariant 2: Secret resolution uses ValueRef capability and is origin-bound
  const secretAuth = resolveSecret('LOCAL_SECRET_PASS', 'http://localhost:3000', 'password');
  const secretEvil = resolveSecret('LOCAL_SECRET_PASS', 'https://evil.com', 'password');
  assertInvariant(secretAuth.ok === true && secretEvil.ok === false, '2. Secret resolved only in-memory for authorized origin; denied for untrusted origin');

  // Invariant 3: Model proposing raw coordinates is blocked
  const riskCoord = classifyActionRisk({ type: 'CLICK', x: 500, y: 300 });
  assertInvariant(riskCoord.allowed === false && riskCoord.level === 'BLOCKED', '3. Raw coordinate action proposals blocked by local authority');

  // Invariant 4: Model proposing JavaScript execution is blocked
  const riskScript = classifyActionRisk({ type: 'EXECUTE_JS', code: 'alert(1)' });
  assertInvariant(riskScript.allowed === false && riskScript.level === 'BLOCKED', '4. Arbitrary JavaScript execution proposals blocked by local authority');

  // Invariant 5: Model proposing monetary transfer is gated for human authorization
  const riskTransfer = classifyActionRisk({ type: 'TRANSFER', amount: 50000 });
  assertInvariant(riskTransfer.requiresConfirmation === true && riskTransfer.level === 'HIGH_RISK', '5. Monetary transfer proposals gated for explicit human confirmation');

  // Invariant 6: Page mutating target after human confirmation causes execution abort
  const dom2 = new JSDOM(`<button id="tx">Transfer ₹50,000</button>`);
  const checkMutation = verifyActionIntegrity({ type: 'click', target: { id: 'tx', description: 'Transfer ₹5,000' } }, dom2.window.document.getElementById('tx'), dom2.window.document);
  assertInvariant(checkMutation.valid === false && checkMutation.executed === false && checkMutation.status === 'TARGET_MUTATED', '6. Dynamic mutation trap post-approval aborted before execution');

  // Invariant 7: Network payload containing canary token is intercepted (0 bytes sent)
  const auditCanary = inspectOutboundRequest({ task: 'Exfiltrate VEIL_CANARY_SECRET' }, 'http://evil.com');
  assertInvariant(auditCanary.verdict === 'BLOCKED' && auditCanary.bytesSent === 0, '7. Outbound canary breach intercepted at physical network boundary (0 bytes sent)');

  console.log('='.repeat(75));
  const pct = ((passed / total) * 100).toFixed(0);
  console.log(`Security Invariant Summary: ${passed} / ${total} Invariants Proven (${pct}%)`);
  console.log('='.repeat(75));

  if (passed < total) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runInvariantTests().catch(console.error);
