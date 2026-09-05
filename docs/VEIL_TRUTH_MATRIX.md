# VEIL — Master Truth & Verification Matrix

**Standard**: Zero-Trust Empirical Code & Runtime Traceability  
**Auditor**: Independent Forensic Verification Authority  
**Rule**: No claim may appear without direct trace to executable source code and reproducible test evidence.

---

## 1. Capability Ground Truth Matrix

| Capability | Code Path | Runtime Verified? | Integration Verified? | Adversarially Tested? | Benchmark | Limitations | Last Verified | Environment |
|---|---|:---:|:---:|:---:|---|---|:---:|---|
| **DOM TreeWalker Extraction** | [`core/dom-utils.js`](file:///d:/veil/veil-extension/core/dom-utils.js) | **YES** | **YES** | **YES** | `benchmark/run-benchmark.js` | Open shadow roots only; closed roots blocked by browser sandbox | 2026-09-05 | Node / JSDOM + Chrome MV3 |
| **Span-Arbitrated Regex PII** | [`core/detector.js`](file:///d:/veil/veil-extension/core/detector.js) | **YES** | **YES** | **YES** | `benchmark/detector-classification-test.js` | Rule-based regex vocabulary (email, phone, card, aadhaar, pan); relies on P8 for unmodeled secrets | 2026-09-05 | Node / JSDOM + Chrome MV3 |
| **Luhn Card Checksum** | [`core/detector.js`](file:///d:/veil/veil-extension/core/detector.js) | **YES** | **YES** | **YES** | `benchmark/run-benchmark.js` | 13-19 digit cards only | 2026-09-05 | Node / JSDOM |
| **Context Sanitization** | [`core/context-builder.js`](file:///d:/veil/veil-extension/core/context-builder.js) | **YES** | **YES** | **YES** | `benchmark/run-formal-certification.js` | Strips all `.value` properties; relies on stable IDs for node tracking | 2026-09-05 | Node / JSDOM + Chrome MV3 |
| **Pre-Flight Privacy Gate** | [`core/privacy-audit.js`](file:///d:/veil/veil-extension/core/privacy-audit.js) | **YES** | **YES** | **YES** | `benchmark/run-network-forensics.js` | Regex scan of serialized outbound JSON before dispatch | 2026-09-05 | Node / JSDOM + Chrome MV3 |
| **In-Memory ValueRef Vault** | [`core/secret-vault.js`](file:///d:/veil/veil-extension/core/secret-vault.js) | **YES** | **YES** | **YES** | `benchmark/run-formal-certification.js` | Origin-bound resolution; currently migrating from static tokens to single-use capabilities | 2026-09-05 | Chrome MV3 (Memory) |
| **TOCTOU Mutation Guard** | [`core/mutation-guard.js`](file:///d:/veil/veil-extension/core/mutation-guard.js) | **YES** | **YES** | **YES** | `benchmark/run-confirmation-fsm-test.js` | Revalidates element connectivity, disabled state, and word overlap | 2026-09-05 | Node / JSDOM + Chrome MV3 |
| **Semantic Action Resolver** | [`core/action-resolver.js`](file:///d:/veil/veil-extension/core/action-resolver.js) | **YES** | **YES** | **YES** | `benchmark/run-resolver-test.js` | Jaccard word-overlap scoring ($\ge 0.30$); fails closed if ambiguous | 2026-09-05 | Node / JSDOM + Chrome MV3 |
| **Action Risk Classification** | [`core/risk-classifier.js`](file:///d:/veil/veil-extension/core/risk-classifier.js) | **YES** | **YES** | **YES** | `benchmark/run-security-test.js` | Monetary transfers, purchases, and deletions marked HIGH_RISK | 2026-09-05 | Node / JSDOM + Chrome MV3 |
| **Human Confirmation Gate** | [`content/high-risk-confirmation.js`](file:///d:/veil/veil-extension/content/high-risk-confirmation.js) | **PARTIAL** | **YES** | **VULNERABLE** | `benchmark/run-confirmation-fsm-test.js` | In-page DOM modal vulnerable to clickjacking; migrating to extension-owned surface | 2026-09-05 | Chrome MV3 |
| **In-Page Redaction Overlay** | [`content/redactor.js`](file:///d:/veil/veil-extension/content/redactor.js) | **PARTIAL** | **YES** | **VULNERABLE** | `benchmark/run-vision-test.js` | Renders .veil-bar; copies secrets to data-veil-reveal (P0 bug slated for Phase 3 fix) | 2026-09-05 | Chrome MV3 |
| **Visual Pixel OCR** | [`core/visual-ocr.js`](file:///d:/veil/veil-extension/core/visual-ocr.js) | **PARTIAL** | **YES** | **PARTIAL** | `benchmark/run-real-ocr-test.js` | Benchmarks use synthetic fixture hooks; real Transformers TrOCR available in Chrome | 2026-09-05 | Chrome MV3 / WebGPU |
| **Face Biometric Detection** | [`content/vision-fallback.js`](file:///d:/veil/veil-extension/content/vision-fallback.js) | **YES** | **YES** | **YES** | `benchmark/run-vision-test.js` | Transformers.js owlvit-base-patch32; falls back gracefully if offline | 2026-09-05 | Chrome MV3 / WebGPU |
| **FastAPI Reasoner Gateway** | [`server/app.py`](file:///d:/veil/veil-extension/server/app.py) | **YES** | **YES** | **PARTIAL** | `server/test_phase1.py` | Enforces Pydantic extra="forbid"; CORS currently allow_origins=["*"] (P0 fix in Phase 2) | 2026-09-05 | Python 3.10+ / FastAPI |
| **Ollama Multimodal Client** | [`server/vlm_client.py`](file:///d:/veil/veil-extension/server/vlm_client.py) | **YES** | **YES** | **YES** | `benchmark/run-real-ollama-e2e.js` | Strict evidence mode (VEIL_EVIDENCE_MODE=true) fails closed with HTTP 503 | 2026-09-05 | Ollama / qwen2-vl:7b |
| **Single Egress Choke Point** | [`background/background.js`](file:///d:/veil/veil-extension/background/background.js) | **YES** | **YES** | **YES** | `benchmark/run-network-forensics.js` | Only service worker calls fetch(); content script restricted to IPC | 2026-09-05 | Chrome MV3 Service Worker |
| **Network Canary Interceptor** | [`core/network-forensics.js`](file:///d:/veil/veil-extension/core/network-forensics.js) | **YES** | **YES** | **YES** | `benchmark/run-network-forensics.js` | 8 synthetic canaries verified blocked; hashString currently djb2 (fix in Phase 2) | 2026-09-05 | Node / JSDOM |
| **Golden Workflow Execution** | [`core/workflow-runner.js`](file:///d:/veil/veil-extension/core/workflow-runner.js) | **SIMULATED**| **PARTIAL** | **NO** | `test.js` | Simulated delays; migrating to formal test specs over VEILRuntime in Phase 5 | 2026-09-05 | Node / JSDOM |
| **Red-Team Defense Suite** | [`benchmark/run-30-attacks.js`](file:///d:/veil/veil-extension/benchmark/run-30-attacks.js) | **PARTIAL** | **YES** | **PARTIAL** | `benchmark/run-30-attacks.js` | Vectors 20-27 short-circuit defenseTriggered=true; migrating to real production gates in Phase 6 | 2026-09-05 | Node / JSDOM |

---

## 2. Invariant Traceability

$$\boxed{\text{"The model proposes. VEIL decides."}}$$

Every capability classified above must adhere to the formal invariant: **The AI model receives cognition; the local VEIL kernel retains absolute authority over secrets and execution.**
