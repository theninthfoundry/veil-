# VEIL — SIH Problem Statement Traceability Matrix

**Problem Statement**: *On-device Visual Perception for Light-weight Browser Agents*  
**Category**: Software / Smart Automation  
**Target Organization**: ISRO / Smart India Hackathon  
**Audit Date**: September 2, 2026  

---

## 1. Traceability Matrix

| SIH Evaluation Criterion | Weight | Required Capability | VEIL Implementation | Test Suite & Artifact | Actual Runtime Evidence | Status | Forensic Assessment |
|---|---|---|---|---|---|---|---|
| **1. Visual Context Accuracy** | **25%** | Extract complete, accurate visual & structural context from the browser screen. | `core/dom-utils.js`, `core/detector.js`, `content/vision-fallback.js` | `benchmark/run-resolver-test.js`, `real-lab/runner/observe.js` | JSDOM DOM TreeWalker extracts interactive tags & labels. Vision fallback for faces exists but is unverified in offline headless env. | 🟡 **PARTIAL / DOM-PROXIED** | DOM/Accessibility extraction is strong and verified. True visual raster perception (WebGPU/OCR) is experimental/unverified. |
| **2. PII Detection Recall / Precision** | **20%** | Accurately detect PII (Aadhaar, PAN, CC, Email, Phone, Password, Address, Name). | `core/detector.js` (DOM attributes, heuristics, span-arbitrated regex) | `benchmark/run-benchmark.js`, `benchmark/fixtures/` | 100% Precision / Recall verified across 15 HTML benchmark fixtures (42/42 items). | ✅ **VERIFIED (Synthetic DOM)** / 🟡 **PARTIAL (Free-text NER)** | Highly accurate on DOM form controls & standard ID formats; lacks NLP NER for unstructured free-text names/addresses. |
| **3. Redaction Precision & Leakage** | **20%** | Redact sensitive items with zero leakage to cloud models. | `content/redactor.js`, `core/context-builder.js`, `core/privacy-audit.js` | `benchmark/run-security-test.js`, `real-lab/runner/live-agent.js` | Value omission in JSON context + double-layer pre-flight regex firewall prevents PII transmission. | ✅ **VERIFIED** | 0.00% Leakage rate empirically confirmed; values stripped from wire payload. |
| **4. Client Resource Utilization** | **20%** | Maintain lightweight footprint (<300MB RAM, low CPU) on client device. | Lightweight JavaScript core (<35KB total core scripts) | `benchmark/run-ablation-study.js` | Base JS core has negligible memory overhead; however, ablation RAM numbers ('84 MB') are hardcoded strings. | ⚠️ **CLAIMED BUT UNPROVEN** | Real client RAM is architecturally low, but live browser memory telemetry is not dynamically instrumented. |
| **5. End-to-End Latency** | **15%** | Sub-second latency from screen perception to local action execution. | Microsecond client timers (`performance.now()`), `FastAPI` async server | `real-lab/run-all.js`, `server/app.py` | Local scan latency is 2ms - 10ms per page. Server Mock VLM responds in <1ms. Live agent loop completes in <850ms. | ✅ **VERIFIED (Mock VLM)** / 🟡 **PARTIAL (Live Ollama)** | Verified on Mock VLM; live Ollama VLM latency depends on hardware (GPU vs CPU). |

---

## 2. Regulatory Compliance Verification

| Regulation | Mandatory Requirement | VEIL Technical Implementation | Forensic Compliance Status |
|---|---|---|---|
| **Digital Personal Data Protection (DPDP) Act, India** | No biometric, financial, or national IDs (Aadhaar, PAN) may be transmitted without consent or to untrusted third-party processors. | Local Regex + Luhn detectors mask Aadhaar, PAN, and CC on-device. `privacy-audit.js` blocks outbound transmission if these identifiers are detected. | **COMPLIANT** |
| **GDPR Article 25 (Data Protection by Design & Default)** | Privacy safeguards must be embedded into the core architecture by default rather than as an optional add-on. | Double-gate architecture (Client serialization omission + Server `extra="forbid"` rejection) ensures privacy by default. | **COMPLIANT** |
