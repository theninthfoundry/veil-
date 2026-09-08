/**
 * Unit Test: VEIL-IR Compiler
 */

const assert = require('assert');
const { JSDOM } = require('jsdom');
const veilIR = require('../core/veil-ir');

console.log('Testing VEIL-IR Compiler...');

const html = `
<!DOCTYPE html>
<html>
<head><title>Secure Banking</title></head>
<body>
  <div id="transfer-box">
    <label for="acc">Target Account</label>
    <input id="acc" type="text" value="9876543210" />
    <label for="pwd">Password</label>
    <input id="pwd" type="password" value="TopSecret123" />
    <button id="send-btn">Send Money</button>
  </div>
</body>
</html>
`;

const dom = new JSDOM(html);
const doc = dom.window.document;

// 1. Compile VEIL-IR
const ir = veilIR.compileVeilIR(doc, [{ element: doc.getElementById('pwd'), type: 'password' }], {
  origin: 'https://bank.example.com'
});

assert(ir.schema === 'veil.ir/v1' || ir.schema === 'veil.ir/v2');
assert(ir.version === '2.0.0' || ir.version === '2.2.0');
assert.strictEqual(typeof ir.stateHash, 'string');
assert.strictEqual(ir.stateHash.length, 64);
assert.strictEqual(ir.origin, 'https://bank.example.com');
assert.strictEqual(ir.elements.length, 3);
console.log(`  ✔ VEIL-IR compiled with stateHash: ${ir.stateHash.slice(0, 16)}...`);

// 2. Validate Zero Secret Leakage (Invariant P1)
const validation = veilIR.validateIR(ir);
assert.strictEqual(validation.valid, true);
assert.strictEqual(validation.errors.length, 0);

// Check that values are strictly omitted
for (const el of ir.elements) {
  assert.strictEqual('value' in el, false);
}

// Check state flags (filled = true, but value is not there)
const pwdEl = ir.elements.find(e => e.tag === 'input' && e.role === 'password');
assert.strictEqual(pwdEl.state.filled, true);
assert.strictEqual(pwdEl.sensitivity, 'SECRET');
assert.strictEqual(pwdEl.expectedSecretType, 'password');
console.log('  ✔ Invariant P1 verified: Elements contain zero .value fields, sensitivity correctly labeled.');

console.log('✅ ALL VEIL-IR TESTS PASSED\n');
