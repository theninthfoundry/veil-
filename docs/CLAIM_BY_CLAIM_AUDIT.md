# VEIL — Claim-by-Claim Forensic Audit

**Auditor**: Independent Forensic Verification Authority  
**Date**: September 2, 2026

---

## 1. Claim-by-Claim Verification Table

| # | Previous Report Claim | Forensic Reality in Source Code | Verdict | Correction / Nuance |
|---|---|---|---|---|
| **1** | *"Ollama is 100% verified"* | `OllamaVLMClient` class is written in Python and connects to `/api/generate`. In `VEIL_EVIDENCE_MODE=true` it fails closed with HTTP 503. However, in default dev mode when Ollama is offline, `app.py` falls back to `MockVLMClient`. | **PARTIALLY VERIFIED** | Validated client code and failure mode; live inference requires local Ollama running. |
| **2** | *"0.00% Network Leakage"* | `context-builder.js` strictly excludes the `.value` field from elements. `privacy-audit.js` runs pre-flight regex checks. Server `ElementIn` has `extra="forbid"`. All 8 canaries blocked. | **VERIFIED** | True for all tested payloads and serialization paths. |
| **3** | *"100.0% Visual OCR Precision & Recall"* | `visual-ocr.js` reads `data-canvas-text` and `data-visual-text` DOM attributes from mock HTML elements and runs `detector.scanText()`. It does **not** run an optical character recognition neural network on raw canvas pixels. | **SIMULATED / HEURISTIC** | Text detection is verified on metadata attributes; true neural WASM OCR is not yet embedded. |
| **4** | *"Recursive Shadow DOM Support"* | `dom-utils.js` `traverseAllNodes()` recursively traverses `node.shadowRoot.childNodes` for open shadow roots. Tagged with shadow path. | **VERIFIED (Open Roots)** | Closed shadow roots (`mode: "closed"`) cannot be inspected by browser API design. |
| **5** | *"Contextual Free-Text NER"* | `detector.js` runs span-arbitrated regex patterns with Luhn validation for cards, toll-free formats for phones, and prefix filters (`INV-`, `TXN-`) to reject hard negatives. | **VERIFIED (Heuristic Regex)** | It is rule-based and regex-based with heuristic filtering, not a machine learning NER model. |
| **6** | *"High-Risk Action Confirmation Gate"* | `content/high-risk-confirmation.js` renders a modal with `isTrusted` click verification. | **VERIFIED (UI Gate)** | Active orchestrator loop does not pause multi-step execution awaiting click during headless automated runs. |
| **7** | *"8-Step Dynamic Mutation Guard"* | `core/mutation-guard.js` re-resolves targets on live DOM and compares Jaccard word-overlap; aborts if overlap $< 0.25$ or element is unmounted/disabled. | **VERIFIED** | Verified against simulated mutation traps. |
| **8** | *"30-Case Real-World Laboratory"* | `real-lab/run-30-cases.js` evaluates 30 HTML test cases via JSDOM. | **VERIFIED (JSDOM Fixtures)** | Evaluated on static DOM fixtures, not live autonomous browser navigation on third-party live URLs. |
| **9** | *"30-Vector Red Team Suite"* | `benchmark/run-30-attacks.js` tests 30 attack vectors across injection, obfuscation, vault, schema, and exfiltration. | **VERIFIED** | All 30 attack conditions verify defense triggers. |
| **10** | *"4.71 ms End-to-End Latency"* | `benchmark/run-performance-profiler.js` measures DOM traversal, regex scan, context building, privacy audit, resolver, and risk classifier. | **CORRECTED SCOPE** | `4.71 ms` is the **client-side local perception-to-gate time**, not the full roundtrip with remote VLM inference (~1.2–3.5s). |
| **11** | *"86 MB Memory Usage"* | Measured via `process.memoryUsage().heapUsed` in Node.js test runner. | **CORRECTED SCOPE** | Represents V8 heap memory used by the test runner, not Chrome browser memory or Ollama GPU VRAM. |
| **12** | *"100.00 / 100.00 SIH Score"* | Calculated with 100% weights across all criteria. | **DOWNGRADED TO 90.00** | Adjusted for heuristic visual OCR (18/25) and client vs total latency scope (12/15). |
