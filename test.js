/**
 * VEIL v1.0 — Master Test & Certification Runner
 *
 * Runs all test suites from the root directory with a single command:
 *   node test.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('='.repeat(75));
console.log('🛡️  VEIL v1.0 — MASTER SYSTEM TEST & CERTIFICATION RUNNER');
console.log('='.repeat(75));

const SUITES = [
  { name: '1. Architecture & Installation Self-Test', file: 'veil-extension/scripts/verify-installation.js' },
  { name: '2. Seven-Scene SIH Demo Story Verification', file: 'veil-extension/benchmark/run-sih-7scenes.js' },
  { name: '3. Seven-Pillar (C1 - C7) Certification & Profiler', file: 'veil-extension/benchmark/run-formal-certification.js' },
  { name: '4. Real On-Device Pixel OCR Benchmark (10 Canvas Fixtures)', file: 'veil-extension/benchmark/run-real-ocr-test.js' },
  { name: '5. High-Risk Human Confirmation FSM & TOCTOU Suite', file: 'veil-extension/benchmark/run-confirmation-fsm-test.js' }
];

let totalPassed = 0;

for (const suite of SUITES) {
  console.log(`\n▶ RUNNING: ${suite.name}`);
  console.log('-'.repeat(75));
  try {
    const output = execSync(`node ${suite.file}`, {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: 'inherit'
    });
    totalPassed++;
  } catch (err) {
    console.error(`✖ ERROR in suite: ${suite.name}`);
  }
}

console.log('\n' + '='.repeat(75));
console.log(`🏆 ALL SUITES FINISHED: ${totalPassed} / ${SUITES.length} SUITES VERIFIED`);
console.log('='.repeat(75));
console.log('\nTo test the visual Command Center UI in Chrome:');
console.log('  1. Open Chrome -> chrome://extensions/ -> Load Unpacked -> "veil-extension"');
console.log('  2. Open file: d:\\veil\\veil-extension\\command-center\\command-center.html\n');
