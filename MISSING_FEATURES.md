# VEIL — Missing Features & Engineering Debt Inventory

**Audit Date**: September 2, 2026  
**Auditor**: Forensic Engineering Assessment System  

---

## P0 — Critical Correctness & Security Gaps
*Must be resolved immediately for baseline integrity and security correctness.*

1. **Vault Wildcard Origin Vulnerability (`core/secret-vault.js`)**
   - *Problem*: `DEFAULT_VAULT` includes `'*'` in `allowedOrigins` for demo card/address/phone entries.
   - *Risk*: Any webpage or malicious script could resolve real demo credentials unless explicitly scoped.
   - *Fix*: Remove `'*'` from `allowedOrigins`; enforce explicit domain matching (`localhost`, `127.0.0.1`, specific trusted demo origins).

2. **Benchmark & Test Harness Hanging (`benchmark/run-all-tests.js`)**
   - *Problem*: `run-all-tests.js` was referencing `test-improved-detector.js` instead of `run-benchmark.js`, causing test execution to stall.
   - *Fix*: Align test suite file paths in `run-all-tests.js`.

3. **Weak / Synthetic Assertions in Penetration Suite**
   - *Problem*: Attack 7 in `run-adversarial-attacks.js` asserts `MAX_STEPS === 5` rather than executing a loop. Test 9 in `run-security-test.js` asserts `res.ok === true` for unauthorized domain.
   - *Fix*: Replace constant assertions with true mutation / failure execution tests.

4. **Synthetic Ablation Study Data (`benchmark/run-ablation-study.js`)**
   - *Problem*: RAM values (`'84 MB'`, `'1,420 MB'`) and Config C VLM latency (`185.0 ms`) are hardcoded arguments in `evaluateConfig()`.
   - *Fix*: Measure actual memory usage (`process.memoryUsage()`) and real VLM response times.

---

## P1 — Required for Credible SIH Production MVP
*Essential capabilities required by the SIH problem statement and evaluation rubric.*

1. **Genuine On-Device OCR Engine for Raster PII**
   - *Problem*: `vision-fallback.js` attempts face detection via OWL-ViT but cannot read text inside canvas, receipts, or PDF viewers.
   - *Requirement*: Embed a lightweight WebAssembly/ONNX OCR engine (e.g. Tesseract.js WASM or PaddleOCR ONNX) to extract and mask text rendered inside images/canvas.

2. **Live Ollama Multimodal VLM End-to-End Verification**
   - *Problem*: The system defaults to `MockVLMClient` (rule-based keyword heuristic).
   - *Requirement*: Connect and benchmark with a local running Ollama instance (`qwen2-vl:7b` or `llama3.2-vision`) to verify that the model successfully reasons over sanitized structural context and outputs valid JSON action targets.

3. **Live Interactive Pipeline in Lab UI (`lab.html`/`lab.js`)**
   - *Problem*: `lab.js` relies on a static `CASE_DATABASE` with `setTimeout` animations rather than driving the real active browser tab.
   - *Requirement*: Connect `lab.js` to `chrome.tabs.sendMessage` so clicking "Execute Pipeline" runs the real `scanForPII()`, `runPrivacyAudit()`, and `callServer()` against the currently loaded tab.

4. **Dynamic Client Memory & Latency Profiling**
   - *Problem*: Telemetry measures DOM scan time, but does not capture Chrome extension heap allocation or client CPU load.
   - *Requirement*: Instrument `performance.memory` (where available in Chromium) and end-to-end network waterfall telemetry in the popup and Live Inspector HUD.

---

## P2 — Strong Differentiators & Advanced Hardening
*High-value technical capabilities that elevate the solution above competing entries.*

1. **Shadow DOM & Nested iframe Traversal**
   - *Problem*: `querySelectorAll` does not traverse Shadow Roots or cross-origin iframes.
   - *Enhancement*: Implement recursive `TreeWalker` that inspects open Shadow DOM roots and configure `all_frames: true` in `manifest.json`.

2. **Lightweight Free-Text Named Entity Recognition (NER)**
   - *Problem*: Names and addresses are only detected if input attributes (`autocomplete="name"`, `name="address"`) exist.
   - *Enhancement*: Integrate a small rule-based / Gazetteer dictionary or a micro-WASM NER model to detect names in arbitrary unstructured paragraphs.

3. **Interactive User Confirmation Modal for HIGH_RISK Actions**
   - *Problem*: `risk-classifier.js` flags `HIGH_RISK` actions (`requiresConfirmation: true`), but the content script executor lacks a modal UI to prompt the user for interactive approval.
   - *Enhancement*: Render a modal in `inspector-overlay.js` requesting 1-click confirmation before executing financial purchases or destructive actions.

---

## P3 — Future Research & Enterprise Production Features
*Long-term platform extensions.*

1. **Hardware-Backed WebAuthn Enclave for Secret Vault**
   - Store vault credentials in browser-protected credentials manager backed by TPM / Secure Enclave.
2. **Multi-Tab / Multi-Domain Agent State Synchronization**
   - Enable the autonomous agent to navigate across multiple browser tabs (e.g., retrieving an OTP from email tab to complete a checkout tab).
3. **Declarative User Privacy Policy Editor**
   - UI for defining custom P0-P4 sensitivity classifications, custom regex rules, and domain-specific vault access policies.
