# VEIL — Master Implementation Matrix

**Audit Date**: September 2, 2026  
**Auditor**: Forensic Engineering Assessment System  
**Legend**:
- **VERIFIED**: Genuinely implemented, tested, and empirically verified at runtime.
- **PARTIAL**: Partially implemented with architectural limitations or environment dependencies.
- **MOCKED**: Uses simulated logic or fallback heuristics rather than production models.
- **HARDCODED / SYNTHETIC**: Pre-packaged metrics, fixed responses, or synthetic timer loops.
- **UNPROVEN**: Code exists but lacks real-world or production verification.

---

| Component | Exists | Wired | Tested | Runtime Verified | Real Implementation | Mocked | Hardcoded | Security Risk | Status | Forensic Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| **Chrome Extension Manifest V3** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Valid permissions (`activeTab`, `tabs`, `storage`). |
| **Content Script Orchestrator** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Correctly coordinates perception, redaction, and messaging. |
| **Background Service Worker** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Handles extension messaging and `POST /act` HTTP calls. |
| **DOM TreeWalker & Perception** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Traverses text nodes and interactive form controls. |
| **Regex & Luhn PII Engine** | Yes | Yes | Yes | Yes | Yes | No | No | Medium | **VERIFIED** | Span arbitration for PAN, Aadhaar, Email, Phone, Cards. |
| **Semantic Free-Text NER (Name/Address)** | Partial | Partial | No | No | No | No | Yes | High | **PARTIAL** | Only detects names/addresses via DOM input attributes. |
| **Visual Face Detection (Transformers.js)** | Yes | Yes | No | No | Partial | No | No | Medium | **UNPROVEN** | Network dependency on HuggingFace; unexecuted in offline env. |
| **Visual OCR / Canvas PII Detection** | No | No | No | No | No | No | No | High | **NOT IMPLEMENTED** | No local OCR engine (Tesseract/PaddleOCR) in place. |
| **Visual Redaction Overlay Layer** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Non-destructive absolute DOM overlay `#veil-redaction-layer`. |
| **Context Builder (Zero Values)** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Omits `value` property; tags elements with `data-veil-id`. |
| **Pre-Flight Privacy Audit Firewall** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Hard blocks outbound requests if regex or value matches leak. |
| **Server Pydantic Extra Forbid Schema** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Rejects any request containing a `value` field with HTTP 422. |
| **Prompt Injection Defense (Server Regex)** | Yes | Yes | Yes | Yes | Yes | No | No | Medium | **VERIFIED** | Flags adversarial prompt markers in element labels with HTTP 400. |
| **Local Secret Reference Vault (ValueRef)** | Yes | Yes | Yes | Yes | Yes | No | No | Medium | **VERIFIED** | Resolves credentials on-device; default vault includes `'*'`. |
| **Fuzzy Semantic Action Resolver** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Jaccard word overlap (threshold 0.3) prevents mis-clicks. |
| **Action Risk Classifier (4 Tiers)** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Classifies SAFE, SENSITIVE, HIGH_RISK, BLOCKED. |
| **Native DOM Action Executor** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Dispatches native `focus`, `input`, `change`, `click` events. |
| **Tamper-Evident Security Ledger** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Stores event timeline; scrubs secret values from records. |
| **Autonomous Loop Orchestrator** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | FSM state transitions; strictly enforces MAX_STEPS = 5. |
| **Failure Analyzer & Error Taxonomy** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Provides structured error codes (ERR_SEC_001 to ERR_ORCH_008). |
| **FastAPI Reasoning Server (`app.py`)** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Validated via TestClient and Uvicorn runtime execution. |
| **Mock VLM Client (`vlm_client.py`)** | Yes | Yes | Yes | Yes | Yes | Yes | No | Low | **VERIFIED (Mock)** | Deterministic keyword heuristic planner for demos/tests. |
| **Ollama VLM Client (`vlm_client.py`)** | Yes | Yes | No | No | Partial | No | No | Medium | **PARTIAL / UNPROVEN** | Code exists for Ollama API; requires running Ollama server. |
| **Side-by-Side Comparison UI** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Displays live real vs sanitized state via session storage. |
| **Privacy Observatory Popup** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Interactive tabbed HUD, live counters, telemetry display. |
| **In-Page Live Inspector HUD** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Floating in-page UI overlay for real-time inspection. |
| **Live Lab Studio (`lab.html`/`lab.js`)** | Yes | Partial | No | No | No | Yes | Yes | Low | **MOCKED / SIMULATED** | Uses `CASE_DATABASE` & `setTimeout` simulation timers. |
| **Evaluation Scorecard (`proof.html`)** | Yes | No | No | No | No | Yes | Yes | Low | **HARDCODED / SYNTHETIC** | Displays animated canned test assertions via timer loop. |
| **15-Fixture PII Precision Benchmark** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Measures actual precision/recall across 15 HTML files. |
| **4-Configuration Ablation Study** | Yes | Yes | Yes | Yes | Partial | Yes | Yes | Low | **HARDCODED / SYNTHETIC** | RAM numbers & Config C VLM latency (185ms) are hardcoded. |
| **7-Attack Penetration Test Suite** | Yes | Yes | Yes | Yes | Yes | No | Partial | Low | **VERIFIED / PARTIAL** | Attack 7 asserts `MAX_STEPS === 5`; Attacks 1-6 test real logic. |
| **Real-Lab Multi-Mode Test Suite** | Yes | Yes | Yes | Yes | Yes | No | Partial | Low | **VERIFIED** | Evaluates 10 real-world benchmark pages via JSDOM. |
| **Real-World Live Web Generalization** | Partial | Partial | No | No | Partial | No | No | High | **UNPROVEN** | Evaluated on static HTML fixtures; untested on complex SPAs. |
| **Telemetry & Latency Waterfalls** | Yes | Yes | Yes | Yes | Yes | No | No | Low | **VERIFIED** | Uses `performance.now()` for client/DOM scan timings. |
