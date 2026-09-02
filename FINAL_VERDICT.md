# VEIL — Forensic Engineering Final Verdict & Readiness Scorecard

**Audit Date**: September 2, 2026  
**Auditor**: Forensic Engineering Assessment System  
**Repository**: `theninthfoundry/veil-`  

---

# EXECUTIVE VERDICT

VEIL possesses a **sound, innovative, and fundamentally strong privacy-first architecture**. Its separation of browser automation into three independent authorities—*Perception*, *Privacy*, and *Action*—addresses the core challenge of the ISRO SIH problem statement with elegant engineering: **raw credentials and form values genuinely do not leave the device**, semantic actions operate without pixel coordinates, and local ValueRef resolution ensures credentials are only injected at native dispatch time.

However, the repository currently exists as a **high-fidelity controlled prototype rather than a production-ready system**. While the core DOM perception, regex PII detection, redaction overlay, privacy firewall, risk classifier, and ValueRef executor are genuinely implemented and verified, several claimed metrics (such as client RAM and vision ablation figures) are synthetic strings, the visual perception fallback (WebGPU/OWL-ViT) is unverified in offline environments, and the interactive Lab UI uses pre-packaged simulations.

With the 8-step hardening roadmap executed, VEIL will stand as an exceptionally strong, scientifically credible contender for the SIH finale.

---

# WHAT IS GENUINELY BUILT
1. **Manifest V3 Extension**: Content script orchestrator, background service worker network funnel, and popup interface.
2. **DOM Perception & Structure Extraction**: TreeWalker for text and interactive controls with human-readable label derivation.
3. **Span-Arbitrated PII Engine**: Regex + DOM attribute detectors with Luhn checksum validation for Cards, Aadhaar, PAN, Emails, and Phones.
4. **Visual Blackout Redactor**: Non-destructive fixed CSS overlay layer (`#veil-redaction-layer`) that covers sensitive fields without modifying native DOM text.
5. **Pre-Flight Privacy Audit Firewall**: Double-layer gate verifying zero `value` fields and zero PII regex matches prior to network egress.
6. **Local Secret Reference Vault (ValueRef)**: In-memory credential storage enabling the AI to reason over symbolic references (`LOCAL_SECRET_01`) while resolving real secrets strictly on-device.
7. **Semantic Action Resolver & Executor**: Jaccard word-overlap fuzzy matching (score >= 0.3) and native DOM event dispatching (`focus`, `input`, `change`, `click`).
8. **Action Risk Classifier**: 4-tier classification (SAFE, SENSITIVE, HIGH_RISK, BLOCKED) with sensitive input protection.
9. **Tamper-Evident Security Ledger**: Event timeline logger that strictly scrubs credentials from session records.
10. **Autonomous Multi-Step Orchestrator**: Finite State Machine enforcing a hard step budget (`MAX_STEPS = 5`) and mandatory re-perception.
11. **FastAPI Reasoning Gateway**: Pydantic schema validation with `extra="forbid"`, prompt injection scanner, and clean JSON endpoints.

---

# WHAT IS PARTIALLY BUILT
1. **Ollama Multimodal VLM Integration**: `OllamaVLMClient` class is written in Python, but defaults to `MockVLMClient` for dev/test execution.
2. **Semantic Free-Text NER**: Name and address detection relies entirely on DOM input attributes (`autocomplete`, `name`, `id`); no NLP model exists for unstructured paragraphs.
3. **Penetration Attack Test Suite**: Attacks 1–6 execute genuine logic; Attack 7 is a static constant assertion.
4. **Real-Lab Multi-Mode Suite**: Executes all 10 real-world benchmark pages via JSDOM, but increments pass counters unconditionally.

---

# WHAT IS MOCKED / SIMULATED
1. **Mock VLM Reasoner (`MockVLMClient`)**: Uses deterministic keyword heuristics to plan ValueRef actions and button clicks.
2. **Interactive Live Lab (`lab.html`/`lab.js`)**: Uses a static `CASE_DATABASE` with `setTimeout()` timers to simulate the pipeline rather than executing against the live active tab.

---

# WHAT IS HARDCODED / SYNTHETIC
1. **Ablation Study RAM & VLM Latency (`run-ablation-study.js`)**: Memory numbers (`'84 MB'`, `'1,420 MB'`) and Config C latency (`185.0 ms`) are hardcoded string/float arguments passed to `evaluateConfig()`.
2. **Evaluation Scorecard Animation (`proof.js`)**: The "Run All Integrity Tests" button runs a timer animation displaying canned PASS badges without executing tests.
3. **Ablation Study Config C & D Code**: Config C uses a stub `(doc) => [{ type: 'face' }]`; Config D duplicates Config B with synthetic latency added.

---

# WHAT IS UNPROVEN
1. **Local WebGPU / Transformers.js Vision Fallback**: `vision-fallback.js` imports Hugging Face packages and OWL-ViT model over the internet; it has not executed successfully in offline/headless environments.
2. **Live Browser Memory Footprint**: Claimed client memory (<90 MB) is architecturally expected but has not been dynamically profiled using browser performance tools.
3. **Complex SPA / Shadow DOM Generalization**: Behavior on heavy React/Angular apps using open/closed Shadow Roots and cross-origin iframes remains unverified.

---

# WHAT IS MISSING
1. **Local WebAssembly OCR Engine**: To perceive text rendered inside canvas, images, and scanned receipts.
2. **Strict Whitelisting in Default Vault**: Default vault currently includes `'*'` wildcard for demo convenience.
3. **Interactive Confirmation Modal**: Visual in-page dialog for user approval of `HIGH_RISK` actions.
4. **Shadow DOM & Cross-Origin iframe Traversal**.

---

# CRITICAL SECURITY GAPS
1. **Default Vault Origin Wildcard**: Seed secrets contain `'*'` in `allowedOrigins`, permitting any domain to resolve demo secrets.
2. **Label Extraction PII Leakage**: If real PII is hardcoded inside element `placeholder` or `aria-label` attributes and does not match standard ID regexes, it could be serialized into context.

---

# CRITICAL TECHNICAL GAPS
1. **No Raster / Canvas Text Reading**: Pure DOM scanner cannot see text drawn on HTML5 `<canvas>` or raster images.
2. **Lack of Dynamic Memory Telemetry**: Memory claims in benchmarks are currently synthetic rather than instrumented.

---

# SIH REQUIREMENTS NOT YET SATISFIED
1. **Criterion 1 (Visual Context Accuracy - 25%)**: Satisfied via DOM/accessibility tree, but raster/visual perception is unverified/stubbed.
2. **Criterion 4 (Client Resource Utilization - 20%)**: Memory claims require empirical proof via dynamic profiler.

---

# BENCHMARK CLAIMS THAT CANNOT YET BE TRUSTED
1. **"84 MB Client RAM" & "1.4 GB VLM RAM"**: Hardcoded strings in `run-ablation-study.js`.
2. **"185 ms Naive VLM Latency"**: Hardcoded synthetic offset in `run-ablation-study.js`.
3. **"41/41 Verified" on Proof Page**: Synthetic UI timer animation in `proof.js`.

---

# TOP 10 THINGS TO BUILD NEXT
1. Remove `'*'` wildcard in `secret-vault.js` and enforce strict domain whitelisting.
2. Replace hardcoded ablation memory/latency values with real `process.memoryUsage()` measurements.
3. Wire `lab.html` to real browser tabs via `chrome.tabs.sendMessage` instead of `CASE_DATABASE`.
4. Bundle lightweight Tesseract.js WASM / PaddleOCR ONNX for local raster/canvas PII detection.
5. Connect and verify live Ollama VLM (`qwen2-vl` / `llama3.2-vision`) with automatic mock fallback.
6. Build an interactive in-page confirmation modal for `HIGH_RISK` transactions.
7. Implement recursive Shadow DOM tree-walking in `context-builder.js` and `detector.js`.
8. Add `all_frames: true` to `manifest.json` for cross-frame perception.
9. Fix test suite runner in `run-all-tests.js` to execute all 5 suites in under 3 seconds.
10. Instrument real-time heap telemetry in the Privacy Observatory popup.

---

# RECOMMENDED FINAL ARCHITECTURE

```
LIVE WEBPAGE (DOM + Shadow Roots + Canvas/Images)
       │
       ▼
LOCAL ON-DEVICE PERCEPTION
├── DOM TreeWalker (Accessibility & Input Attributes)
└── WASM OCR Engine (Canvas & Image Text Extraction)
       │
       ▼
SPAN-ARBITRATED PRIVACY ENGINE
├── Aadhaar / PAN / CC (Luhn) / Email / Phone Regexes
└── Visual Face / Raster Blurring
       │
       ▼
PRE-FLIGHT PRIVACY FIREWALL
├── Serialized Context Audit (Zero values allowed)
└── Task String Parameter Smuggling Check
       │
       ▼ (Sanitized Structural Skeleton JSON Only)
══════════════════════════════════════════════════════
DEVICE PERIMETER BOUNDARY (0 Bytes Raw PII / Bitmaps)
══════════════════════════════════════════════════════
       │
       ▼
REASONING GATEWAY (Local Ollama / Hosted Open-Weight VLM)
└── Outputs Semantic Target & ValueRef ("LOCAL_SECRET_01")
       │
       ▼ (Semantic Action Proposal)
══════════════════════════════════════════════════════
DEVICE PERIMETER BOUNDARY
══════════════════════════════════════════════════════
       │
       ▼
LOCAL SAFETY & ACTION AUTHORITY
├── Action Risk Classifier (SAFE / SENSITIVE / HIGH_RISK)
├── Interactive Modal Confirmation (If HIGH_RISK)
├── Fuzzy Jaccard DOM Target Resolver (Score >= 0.3)
└── Local Secret Vault (On-Device Credential Injection)
       │
       ▼
NATIVE DOM EXECUTION & RE-PERCEPTION LOOP
└── Finite State Machine (MAX_STEPS = 5)
```

---

# READINESS SCORES (OUT OF 100)

| Evaluation Dimension | Weight | Score | Explanation |
|---|---|---|---|
| **Architecture & Separation of Concerns** | /15 | **14 / 15** | 3-Authority model (Perception, Privacy, Action) is exceptionally well-designed. |
| **Privacy & Security Boundaries** | /20 | **17 / 20** | Invariant P1 holds; double-gate firewall works; minor vault wildcard cleanup required. |
| **DOM & Visual Perception** | /15 | **10 / 15** | DOM/Accessibility perception is robust; raster OCR is currently missing. |
| **AI & Reasoning Integration** | /10 | **7 / 10** | Mock reasoner is clean; live Ollama client built but requires local runtime validation. |
| **Action Execution & ValueRef** | /10 | **9 / 10** | Zero-coordinate resolution, ValueRef injection, and event dispatching work cleanly. |
| **Testing & Empirical Evaluation** | /10 | **7 / 10** | Extensive fixture tests (42/42 PII items); points deducted for synthetic ablation metrics. |
| **Real-World Readiness** | /10 | **5 / 10** | Solid on static/form pages; lacks Shadow DOM and cross-origin iframe handling. |
| **Performance & Resource Efficiency** | /5 | **4 / 5** | Core JS is extremely lightweight (<35KB); real memory telemetry needs instrumentation. |
| **UX & Presentation Quality** | /5 | **4 / 5** | Popup, HUD, Comparison, and Lab UI are visually polished and informative. |

---

### **CURRENT SCORE**: **77 / 100**
### **HONEST MVP SCORE**: **82 / 100**
### **POTENTIAL AFTER ROADMAP COMPLETION**: **96 / 100**

---

# READINESS SUMMARY
- **SIH DEMO READINESS**: **HIGH (Controlled Demo Flow)** — The mock store, checkout flow, ValueRef injection, and side-by-side comparison view provide an outstanding 5-minute presentation narrative.
- **RESEARCH / PUBLICATION READINESS**: **MODERATE** — Architecture and privacy invariant formulations are publication-grade; empirical sections must replace synthetic metrics with live benchmark data.
- **PRODUCTION READINESS**: **PROTOTYPE (Alpha)** — Requires local OCR, Shadow DOM support, and hardware-backed vault before public release.
