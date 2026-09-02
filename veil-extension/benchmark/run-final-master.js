/**
 * VEIL — Final Master Integration & Runtime Telemetry Evaluator
 *
 * Executes the full suite of final gap closure benchmarks:
 *  - Real Pixel OCR
 *  - Human Confirmation FSM
 *  - Live Tab Perception
 *  - Real Ollama E2E & Fail-Closed Validation
 *  - Dynamic Ablation Study
 *  - 30-Vector Red Team Suite
 *  - High-Resolution Performance Profiler
 *
 * Generates benchmark/results/final-runtime.json.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('VEIL — FINAL MASTER INTEGRATION & RUNTIME TELEMETRY');
console.log('='.repeat(70));

const suites = [
  { name: 'Real Pixel OCR Suite', cmd: 'node run-real-ocr-test.js' },
  { name: 'Human Confirmation FSM Suite', cmd: 'node run-confirmation-fsm-test.js' },
  { name: 'Live Tab Perception Suite', cmd: 'node run-live-tab-test.js' },
  { name: 'Real Ollama E2E Latency Decomposition', cmd: 'node run-real-ollama-e2e.js' },
  { name: 'Dynamic Architecture Ablation Study', cmd: 'node run-ablation-study.js' },
  { name: '30-Vector Red Team Penetration Suite', cmd: 'node run-30-attacks.js' },
  { name: 'High-Resolution Performance Profiler', cmd: 'node run-performance-profiler.js' }
];

const suiteResults = [];

for (const suite of suites) {
  console.log(`\n▶ Running: ${suite.name}...`);
  const t0 = performance.now();
  let status = 'PASS';
  let errorMsg = null;

  try {
    const output = execSync(suite.cmd, { cwd: __dirname, encoding: 'utf-8' });
    console.log(output);
  } catch (err) {
    status = 'FAIL';
    errorMsg = err.message;
    console.error(`Error executing ${suite.name}:`, err.stdout || err.message);
  }

  const durationMs = Number((performance.now() - t0).toFixed(2));
  suiteResults.push({
    suite: suite.name,
    command: suite.cmd,
    status,
    durationMs,
    error: errorMsg
  });
}

console.log('='.repeat(70));
console.log('FINAL MASTER EXECUTION SUMMARY');
console.log('='.repeat(70));
suiteResults.forEach(r => {
  console.log(`  ${r.status === 'PASS' ? '✔' : '✖'} [${r.status}] ${r.suite} (${r.durationMs}ms)`);
});

const outDir = path.join(__dirname, 'results');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const finalRuntime = {
  phase: 'FINAL_MASTER_RUNTIME_VERIFICATION',
  timestamp: new Date().toISOString(),
  totalSuites: suites.length,
  passedSuites: suiteResults.filter(s => s.status === 'PASS').length,
  failedSuites: suiteResults.filter(s => s.status === 'FAIL').length,
  suites: suiteResults
};

fs.writeFileSync(path.join(outDir, 'final-runtime.json'), JSON.stringify(finalRuntime, null, 2), 'utf-8');
console.log(`\n✔ Master runtime verification written to benchmark/results/final-runtime.json`);
