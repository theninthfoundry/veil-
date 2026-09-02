# VEIL — Benchmark & Scientific Evaluation Forensic Audit

**Audit Date**: September 2, 2026  
**Auditor**: Forensic Engineering Assessment System  
**Evaluated Scripts**:
- `benchmark/run-benchmark.js` (15 Fixtures)
- `benchmark/run-ablation-study.js` (4 Configurations)
- `benchmark/run-resolver-test.js` (14 Assertions)
- `benchmark/run-security-test.js` (12 Assertions)
- `benchmark/run-adversarial-attacks.js` (7 Attacks)
- `real-lab/run-all.js` (10 Real-World Cases)
- `proof/proof.js` (Scorecard UI)

---

## 1. Metric Origin & Provenance Analysis

Every performance, accuracy, and latency metric reported in the repository documentation and test output was audited back to its exact origin in source code:

| Metric Claim | Source File & Function | Input Data / Fixtures | Ground Truth Reference | Runtime Measured? | Hardcoded / Synthetic? | Forensic Verdict |
|---|---|---|---|---|---|---|
| **100% PII Precision** | `benchmark/run-benchmark.js:103-108` | 15 HTML files in `benchmark/fixtures/` | `benchmark/ground-truth.json` | **YES** | No | **VERIFIED (Synthetic DOM Corpus)**: Calculated from count comparison `tp / (tp + fp)`. |
| **100% PII Recall** | `benchmark/run-benchmark.js:104-108` | 15 HTML files in `benchmark/fixtures/` | `benchmark/ground-truth.json` | **YES** | No | **VERIFIED (Synthetic DOM Corpus)**: Calculated from count comparison `tp / (tp + fn)`. |
| **0.00% Leakage Rate** | `core/privacy-audit.js:123` | Sanitized context + Task strings | `leakedRegions === 0` | **YES** | No | **VERIFIED**: Regex scanner checks serialized outbound strings. |
| **8.7 ms scan latency** (vs 6.0 ms) | `benchmark/run-ablation-study.js:83, 102` | 15 HTML files + JSDOM | `performance.now()` + `3.4ms` synthetic | **PARTIAL** | Yes (Simulated adder) | **SYNTHETIC OFFSET**: Base scan time (~5.3ms) is measured, but `3.4ms` is artificially added in Config D. |
| **84 MB Client RAM** | `benchmark/run-ablation-study.js:102` | None | Hardcoded string `'84 MB'` | **NO** | **YES (Hardcoded)** | **HARDCODED / SYNTHETIC**: String passed directly into table. No memory profiler is executed. |
| **185.0 ms Naive VLM Latency** | `benchmark/run-ablation-study.js:101` | None | Hardcoded float `185.0` | **NO** | **YES (Hardcoded)** | **HARDCODED / SYNTHETIC**: `185.0` is hardcoded as an argument to `evaluateConfig()`. |
| **1,420 MB VLM RAM** | `benchmark/run-ablation-study.js:101` | None | Hardcoded string `'1,420 MB'` | **NO** | **YES (Hardcoded)** | **HARDCODED / SYNTHETIC**: String passed directly into table. |
| **41 / 41 Tests Verified** (Proof UI) | `proof/proof.js:121-175` | Hardcoded fixture array | None (No assertions) | **NO** | **YES (Hardcoded)** | **SYNTHETIC UI ANIMATION**: `proof.js` runs `setTimeout()` animations displaying canned PASS badges. |
| **7 / 7 Attacks Blocked** | `benchmark/run-adversarial-attacks.js` | Synthetic attack payloads | Assertions 1-7 | **PARTIAL** | Partial | **VERIFIED (6/7 Real)**: Attacks 1-6 execute real logic; Attack 7 is a static constant check (`MAX_STEPS === 5`). |
| **14 / 14 Resolver Tests** | `benchmark/run-resolver-test.js` | `fixtures/checkout.html` | Assertions | **YES** | No | **VERIFIED**: Exercises `action-resolver.js` and `action-executor.js` on JSDOM. |
| **10 / 10 Real-Lab Cases** | `real-lab/runner/observe.js:52-59` | 10 `test-pages/case-*.html` | `passed++` loop | **PARTIAL** | Partial | **PARTIAL**: Scans all 10 pages; loop increments `passed++` unconditionally without strict count assertion. |

---

## 2. Forensic Breakdown of the Ablation Study

In `veil-extension/benchmark/run-ablation-study.js`:

```javascript
// Function signature:
function evaluateConfig(configName, scanFn, simulatedLatencyMs, simulatedRamMb) {
  // ...
  const avgLatency = (totalDurationMs / fixtureFiles.length) + simulatedLatencyMs;
  return {
    configName,
    precision: precision.toFixed(1),
    recall: recall.toFixed(1),
    f1: f1.toFixed(1),
    latency: avgLatency.toFixed(1),
    ram: simulatedRamMb // <-- HARDCODED STRING
  };
}

// Invocations:
const results = [
  evaluateConfig('Config A: DOM-Attributes Only', scanConfigA, 0.4, '48 MB'),
  evaluateConfig('Config B: DOM + Regex Engine', scanConfigB, 2.1, '58 MB'),
  evaluateConfig('Config C: Heavy Vision Only (Naive VLM)', (doc) => [{ type: 'face' }], 185.0, '1,420 MB'),
  evaluateConfig('Config D: VEIL Complete Multi-Signal', scanConfigB, 3.4, '84 MB')
];
```

### Critical Findings:
1. **Config C (Heavy Vision Only)** does NOT run a vision model or process images. It is stubbed with `(doc) => [{ type: 'face' }]`, adding `185.0 ms` synthetic latency and `'1,420 MB'` hardcoded RAM.
2. **Config D (VEIL Complete Multi-Signal)** uses the exact same scanning function as Config B (`scanConfigB`), adding `3.4 ms` synthetic latency and `'84 MB'` hardcoded RAM.
3. **Latency Inconsistency**: Documentation mentions "6.0 ms, 84 MB" in some sections and "8.7 ms, 84 MB" in others. The discrepancy arises because base JSDOM scan duration (~5.3ms) plus the `3.4ms` synthetic offset produces `~8.7ms`, whereas earlier runs on faster machines or with fewer fixtures reported `6.0ms`.

---

## 3. Ground Truth Evaluation Integrity

1. **Scoring Proxy**: `run-benchmark.js` explicitly notes that scoring is count-based (`tp = min(detected, expected)`), which serves as a counting proxy across 15 labeled HTML fixtures.
2. **Coverage of 15 Fixtures**: Across the 15 fixtures, 42 sensitive items (Aadhaar, PAN, CC, Email, Phone, Password, Address, Name) are accurately identified by the DOM + Regex engine when standard input types, autocomplete tags, or regex patterns are present.
3. **Generalization Gap**: The 100% precision/recall claim applies strictly to the 15 synthetic benchmark fixtures. On arbitrary unformatted web pages (e.g. names in arbitrary paragraph text without `name` attributes or unspaced Aadhaar numbers), recall will be lower.
