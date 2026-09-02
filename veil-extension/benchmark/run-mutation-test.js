/**
 * VEIL — Phase G Dynamic SPA & Mutation Integrity Suite
 *
 * Tests the 8-step pre-execution validation guard against:
 *  1. Stale / unmounted elements.
 *  2. Semantic mutation traps (e.g. button label changed from "Delete Account" to "Delete Workspace").
 *  3. Disabled target elements.
 *  4. Valid intact elements.
 */

const { JSDOM } = require('jsdom');
const { verifyActionIntegrity } = require('../core/mutation-guard.js');

console.log('='.repeat(70));
console.log('VEIL — Phase G: Dynamic SPA & DOM Mutation Integrity Suite');
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

// ---------------------------------------------------------------------------
// Test 1: Stale / Unmounted Element Defense
// ---------------------------------------------------------------------------
console.log('\n--- 1. Stale / Unmounted Node Defense ---');

const dom1 = new JSDOM(`<!DOCTYPE html><html><body><div id="container"><button id="btn-1">Old Button</button></div></body></html>`);
const doc1 = dom1.window.document;
const btn1 = doc1.getElementById('btn-1');

// Simulate React/SPA rerender where old node is removed
btn1.remove();

const action1 = { type: 'click', target: { id: 'btn-1', description: 'button labeled Old Button' } };
const check1 = verifyActionIntegrity(action1, btn1, doc1);

assert(check1.valid === false && check1.status === 'STALE_TARGET', 'Unmounted element rejected with STALE_TARGET');

// ---------------------------------------------------------------------------
// Test 2: Mutation Trap Defense (Button Label Swapped)
// ---------------------------------------------------------------------------
console.log('\n--- 2. Semantic Mutation Trap Defense ---');

const dom2 = new JSDOM(`<!DOCTYPE html><html><body><button id="danger-btn">Delete Entire Workspace</button></body></html>`);
const doc2 = dom2.window.document;
const dangerBtn = doc2.getElementById('danger-btn');

// Proposed action intended to delete account, but live button was mutated
const action2 = { type: 'click', target: { id: 'danger-btn', description: 'button labeled Cancel Subscription' } };
const check2 = verifyActionIntegrity(action2, dangerBtn, doc2);

assert(check2.valid === false && check2.status === 'MUTATION_DETECTED', 'Label mutation trap detected and aborted');

// ---------------------------------------------------------------------------
// Test 3: Disabled Target Defense
// ---------------------------------------------------------------------------
console.log('\n--- 3. Disabled Target Defense ---');

const dom3 = new JSDOM(`<!DOCTYPE html><html><body><button id="submit-btn" disabled>Processing...</button></body></html>`);
const doc3 = dom3.window.document;
const submitBtn = doc3.getElementById('submit-btn');

const action3 = { type: 'click', target: { id: 'submit-btn', description: 'button labeled Processing' } };
const check3 = verifyActionIntegrity(action3, submitBtn, doc3);

assert(check3.valid === false && check3.status === 'DISABLED_ELEMENT', 'Disabled element rejected with DISABLED_ELEMENT');

// ---------------------------------------------------------------------------
// Test 4: Valid Intact Target Execution
// ---------------------------------------------------------------------------
console.log('\n--- 4. Valid Target Integrity Verification ---');

const dom4 = new JSDOM(`<!DOCTYPE html><html><body><button id="checkout-btn">Place Order ₹4,999</button></body></html>`);
const doc4 = dom4.window.document;
const checkoutBtn = doc4.getElementById('checkout-btn');

const action4 = { type: 'click', target: { id: 'checkout-btn', description: 'button labeled Place Order ₹4,999' } };
const check4 = verifyActionIntegrity(action4, checkoutBtn, doc4);

assert(check4.valid === true && check4.status === 'VALID', 'Intact target verified across all 8 pre-execution checks');

console.log(`\n✔ Phase G SPA Mutation Integrity verified (${passedAssertions}/${totalAssertions} assertions passed)`);
