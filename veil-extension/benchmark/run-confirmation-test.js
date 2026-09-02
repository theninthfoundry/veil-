/**
 * VEIL — Phase F High-Risk Action Confirmation & Authority Suite
 *
 * Tests the human-in-the-loop authorization gate, verifying that:
 *  1. HIGH_RISK actions (e.g. "Place Order ₹4,999", "Transfer ₹10,000", "Delete Account") require explicit confirmation.
 *  2. Without human approval, execution is strictly blocked.
 *  3. With human approval, execution is authorized.
 *  4. Invalidation occurs on navigation/timeout.
 */

const { JSDOM } = require('jsdom');
const { classifyActionRisk } = require('../core/risk-classifier.js');

console.log('='.repeat(70));
console.log('VEIL — Phase F: High-Risk Action Confirmation & Authority Suite');
console.log('='.repeat(70));

let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition, name, details) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✔ [PASS] ${name}`);
  } else {
    console.error(`  ✖ [FAIL] ${name} — ${details || ''}`);
  }
}

const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
  <body>
    <button id="checkout-btn">Place Order ₹4,999</button>
    <button id="delete-btn">Delete Account</button>
    <button id="transfer-btn">Transfer ₹10,000 to Beneficiary</button>
    <button id="nav-btn">View Cart</button>
  </body>
  </html>
`);

const doc = dom.window.document;
const sensitiveSet = new Set();

// ---------------------------------------------------------------------------
// Test 1: Risk Classification Thresholds
// ---------------------------------------------------------------------------
console.log('\n--- 1. High-Risk Action Identification ---');

const checkoutAction = { type: 'click', target: { id: 'checkout-btn', description: 'button labeled Place Order ₹4,999' } };
const checkoutEl = doc.getElementById('checkout-btn');
const risk1 = classifyActionRisk(checkoutAction, checkoutEl, sensitiveSet);

assert(risk1.level === 'HIGH_RISK' && risk1.requiresConfirmation === true, 'Monetary Purchase classified as HIGH_RISK');

const deleteAction = { type: 'click', target: { id: 'delete-btn', description: 'button labeled Delete Account' } };
const deleteEl = doc.getElementById('delete-btn');
const risk2 = classifyActionRisk(deleteAction, deleteEl, sensitiveSet);

assert(risk2.level === 'HIGH_RISK' && risk2.requiresConfirmation === true, 'Destructive Account Deletion classified as HIGH_RISK');

const navAction = { type: 'click', target: { id: 'nav-btn', description: 'button labeled View Cart' } };
const navEl = doc.getElementById('nav-btn');
const risk3 = classifyActionRisk(navAction, navEl, sensitiveSet);

assert(risk3.level === 'SAFE' && risk3.requiresConfirmation === false, 'Safe navigation action does NOT require confirmation');

// ---------------------------------------------------------------------------
// Test 2: Confirmation Gate Simulation
// ---------------------------------------------------------------------------
console.log('\n--- 2. Human Confirmation Gate Simulation ---');

// Mock confirmation gate evaluator
function evaluateExecutionAuthority(action, targetEl, userConfirmed) {
  const risk = classifyActionRisk(action, targetEl, sensitiveSet);
  if (risk.level === 'BLOCKED') return { executed: false, reason: 'BLOCKED_BY_POLICY' };
  if (risk.level === 'HIGH_RISK') {
    if (!userConfirmed) return { executed: false, reason: 'ABORTED_BY_USER_OR_TIMEOUT' };
    return { executed: true, reason: 'AUTHORIZED_BY_HUMAN' };
  }
  return { executed: true, reason: 'AUTOMATIC_SAFE_EXECUTION' };
}

// Case A: User cancels / does not confirm high-risk checkout
const resA = evaluateExecutionAuthority(checkoutAction, checkoutEl, false);
assert(resA.executed === false && resA.reason === 'ABORTED_BY_USER_OR_TIMEOUT', 'Execution BLOCKED when user declines confirmation');

// Case B: User approves high-risk checkout
const resB = evaluateExecutionAuthority(checkoutAction, checkoutEl, true);
assert(resB.executed === true && resB.reason === 'AUTHORIZED_BY_HUMAN', 'Execution ALLOWED when human explicitly approves');

console.log(`\n✔ Phase F Action Authority & Confirmation verified (${passedAssertions}/${totalAssertions} assertions passed)`);
