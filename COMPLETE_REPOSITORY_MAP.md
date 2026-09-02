# VEIL — Complete Repository Map & Runtime Dependency Inventory

**Audit Date**: September 2, 2026  
**Auditor**: Forensic Engineering Assessment System  
**Repository**: `theninthfoundry/veil-`  
**Workspace**: `d:\veil`  

---

## 1. Directory Structure

```
d:\veil\
├── .gitignore
├── README.md                                 # Master project documentation
├── docs/                                     # Architecture, PRD, and threat model specs
│   ├── architecture.md                       # 3-Authority model & system architecture
│   ├── threat-model.md                       # Formal privacy & adversarial threat model
│   ├── veil-prd.md                           # Product Requirements Document
│   ├── VEIL_MASTER_PLAN.md                   # 4-Phase implementation master plan
│   └── VEIL_Phase4_Demo_Lock_Kit.pdf         # Demo runbook & presentation slides
├── real-lab/                                 # Automated Multi-Mode E2E Test Suite
│   ├── package.json                          # Real-lab runner scripts
│   ├── run-all.js                            # Master 3-mode evaluator
│   ├── results/
│   │   └── evaluation-summary.json           # Telemetry summary output
│   └── runner/
│       ├── live-agent.js                     # Mode 3: Live Agent evaluator
│       ├── observe.js                        # Mode 1: Observe mode evaluator
│       └── simulate.js                       # Mode 2: Simulate mode evaluator
├── scripts/                                  # Startup, automation, and commit utility scripts
│   ├── generate-report.ps1                   # Automated test report generator
│   ├── healthcheck.ps1                       # Service healthcheck probe
│   ├── make-commits.ps1                      # Synthetic commit history generation script
│   ├── make-more-commits.ps1                 # Extended commit generation script
│   ├── make-extra-22-commits.ps1             # Additional commit generation script
│   ├── start-all.bat                         # Batch startup script
│   └── start-all.ps1                         # PowerShell dual-server launcher
└── veil-extension/                           # Main Manifest V3 Extension & Backend
    ├── manifest.json                         # Chrome Extension Manifest V3 configuration
    ├── package.json                          # Extension package manifest (tests & deps)
    ├── package-lock.json                     # NPM dependency lockfile
    ├── README.md                             # Extension-level documentation
    ├── background/
    │   └── background.js                     # Background service worker (network gateway)
    ├── benchmark/                            # Evaluation harnesses & benchmark fixtures
    │   ├── diagnose-details.js               # Diagnostic debugging script
    │   ├── diagnose-fixtures.js              # Diagnostic fixture scanner
    │   ├── ground-truth.json                 # Labeled ground truth for 15 fixtures
    │   ├── run-ablation-study.js             # 4-configuration architecture ablation
    │   ├── run-adversarial-attacks.js        # 7-attack penetration test suite
    │   ├── run-all-tests.js                  # Master test harness
    │   ├── run-benchmark.js                  # 15-fixture PII precision/recall benchmark
    │   ├── run-resolver-test.js              # Semantic action resolver test suite
    │   ├── run-security-test.js              # Security invariant & vault test suite
    │   ├── test-improved-detector.js         # Interactive detector debugger
    │   └── fixtures/                         # 15 labeled HTML evaluation benchmarks
    │       ├── bank-dashboard.html
    │       ├── checkout.html
    │       ├── contact-form.html
    │       ├── ecommerce-receipt.html
    │       ├── false-positive-stress.html
    │       ├── govt-portal.html
    │       ├── healthcare-form.html
    │       ├── kyc-summary.html
    │       ├── login.html
    │       ├── mixed-content.html
    │       ├── negative-control.html
    │       ├── obfuscated-form.html
    │       ├── receipt.html
    │       ├── signup.html
    │       └── social-profile.html
    ├── comparison/                           # Side-by-Side Privacy Comparison UI
    │   ├── comparison.css
    │   ├── comparison.html
    │   └── comparison.js
    ├── content/                              # Content Scripts & In-Page Overlays
    │   ├── content.js                        # Master content script orchestrator
    │   ├── inspector-overlay.js              # In-page Live Inspector HUD
    │   ├── redactor.js                       # Non-destructive visual blackout layer
    │   └── vision-fallback.js                # WebGPU/Transformers.js vision fallback
    ├── core/                                 # Pure Core JavaScript Libraries (No DOM deps where possible)
    │   ├── action-executor.js                # Native DOM action dispatcher & vault injector
    │   ├── action-resolver.js                # Fuzzy Jaccard & data-veil-id semantic resolver
    │   ├── agent-orchestrator.js             # Autonomous finite state machine & loop
    │   ├── comparison-builder.js             # Local client comparison data extractor
    │   ├── context-builder.js                # Sanitized skeleton extractor (zero values)
    │   ├── detector.js                       # Span-arbitrated DOM & Regex PII scanner
    │   ├── dom-utils.js                      # Label extractor & Jaccard overlap scorer
    │   ├── failure-analyzer.js               # Structured failure explainability taxonomy
    │   ├── privacy-audit.js                  # Pre-flight outbound payload audit firewall
    │   ├── risk-classifier.js                # 4-tier action risk classifier
    │   ├── secret-vault.js                   # Local Secret Reference Vault (ValueRef)
    │   └── security-ledger.js                # Tamper-evident session event ledger
    ├── icons/                                # Extension icons (16, 48, 128 px)
    ├── lab/                                  # VEIL Live Lab Interactive Studio
    │   ├── lab.css
    │   ├── lab.html
    │   └── lab.js
    ├── popup/                                # Privacy Observatory Extension Popup
    │   ├── popup.css
    │   ├── popup.html
    │   └── popup.js
    ├── proof/                                # Proof & Evaluation Scorecard UI
    │   ├── proof.css
    │   ├── proof.html
    │   └── proof.js
    ├── server/                               # FastAPI Reasoning Gateway & VLM Backends
    │   ├── app.py                            # FastAPI application (POST /act, GET /health)
    │   ├── requirements.txt                  # Python dependencies (fastapi, uvicorn, pydantic, httpx)
    │   └── vlm_client.py                     # MockVLMClient & OllamaVLMClient backends
    ├── test-pages/                           # 10 Real-World Benchmark Taxonomy Testbed Pages
    │   ├── canvas-visual-pii.html
    │   ├── case-001-public-doc.html
    │   ├── case-002-ecommerce-store.html
    │   ├── case-003-login-auth.html
    │   ├── case-004-netbanking.html
    │   ├── case-005-govt-ekyc.html
    │   ├── case-006-healthcare.html
    │   ├── case-007-image-pii.html
    │   ├── case-008-canvas-pii.html
    │   ├── case-009-prompt-injection.html
    │   ├── case-010-dom-mutation.html
    │   ├── dom-mutation-trap.html
    │   ├── index.html                        # Testbed navigation portal & suite runner
    │   ├── mock-checkout.html
    │   ├── prompt-injection-attack.html
    │   └── veil-store.html
    └── vendor/
        └── transformers.web.min.js           # Bundled Hugging Face Transformers.js runtime
```

---

## 2. Artifact Classification

### A. Production Code (Active Runtime Path)
- **Extension Content Layer**: `veil-extension/content/content.js`, `redactor.js`, `inspector-overlay.js`
- **Core Security & Processing**: `veil-extension/core/detector.js`, `dom-utils.js`, `context-builder.js`, `privacy-audit.js`, `risk-classifier.js`, `secret-vault.js`, `action-resolver.js`, `action-executor.js`, `security-ledger.js`, `agent-orchestrator.js`, `failure-analyzer.js`, `comparison-builder.js`
- **Background Gateway**: `veil-extension/background/background.js`
- **Popup & UI**: `veil-extension/popup/popup.js`, `popup.html`, `popup.css`
- **Backend Server**: `veil-extension/server/app.py`, `vlm_client.py`

### B. Test & Benchmark Code (Node / JSDOM)
- `veil-extension/benchmark/run-benchmark.js` (15-fixture evaluation)
- `veil-extension/benchmark/run-security-test.js` (12 security assertions)
- `veil-extension/benchmark/run-resolver-test.js` (14 resolver assertions)
- `veil-extension/benchmark/run-adversarial-attacks.js` (7 attack tests)
- `real-lab/runner/observe.js`, `simulate.js`, `live-agent.js`, `run-all.js`

### C. Benchmark & Evaluation Fixtures
- `veil-extension/benchmark/fixtures/*.html` (15 HTML benchmark files)
- `veil-extension/benchmark/ground-truth.json` (Ground truth counts for 15 fixtures)
- `veil-extension/test-pages/case-001-*.html` to `case-010-*.html` (10 real-world taxonomy pages)

### D. Demo & Presentation UIs
- `veil-extension/lab/lab.html`, `lab.js`, `lab.css` (Interactive evaluation studio)
- `veil-extension/proof/proof.html`, `proof.js`, `proof.css` (Scorecard presentation)
- `veil-extension/comparison/comparison.html`, `comparison.js`, `comparison.css` (Side-by-side view)
- `veil-extension/test-pages/index.html` (Testbed portal)

### E. Experimental / Unverified Code
- `veil-extension/content/vision-fallback.js` (WebGPU / OWL-ViT face detection wrapper; explicitly unverified in offline headless environment)
- `veil-extension/vendor/transformers.web.min.js` (431 KB vendor runtime)

### F. Mock & Simulated Implementations
- `MockVLMClient` in `veil-extension/server/vlm_client.py` (Rule-based keyword planner)
- `CASE_DATABASE` in `veil-extension/lab/lab.js` (Pre-packaged static responses and timer-simulated pipeline execution)
- `runTestSuiteAnimation()` in `veil-extension/proof/proof.js` (Synthetic visual timer loop)
- Hardcoded latency additions & RAM strings in `veil-extension/benchmark/run-ablation-study.js`

### G. Utility & Automation Scripts
- `scripts/start-all.ps1`, `start-all.bat` (Launcher)
- `scripts/healthcheck.ps1`, `generate-report.ps1`
- `scripts/make-commits.ps1`, `make-more-commits.ps1`, `make-extra-22-commits.ps1` (Historical Git commit generation scripts)

---

## 3. Runtime Dependency & Data Flow Map

```
┌────────────────────────────────────────────────────────────────────────┐
│ BROWSER TAB (Target Web Page)                                          │
│                                                                        │
│  DOM Mutation / Initial Load                                           │
│       │                                                                │
│       ▼                                                                │
│  [content.js] ───► [core/detector.js] (scanForPII)                     │
│       │                    │                                           │
│       │                    ▼                                           │
│       ├──────────► [content/redactor.js] (renderRedactions on DOM)     │
│       │                    │                                           │
│       │                    ▼                                           │
│       ├──────────► [core/context-builder.js] (buildSanitizedContext)   │
│       │                    │                                           │
│       │                    ▼                                           │
│       ├──────────► [core/privacy-audit.js] (runPrivacyAudit)           │
│       │                    │                                           │
│       │              Status === PASS                                   │
│       │                    │                                           │
│       ▼                    ▼                                           │
│  chrome.runtime.sendMessage('VEIL_RUN_TASK_SERVER_CALL')               │
└────────────────────────────┬───────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BACKGROUND SERVICE WORKER [background/background.js]                   │
│                                                                        │
│  Receives sanitized JSON: { task, page: { elements: [...] } }          │
│  Bypasses page CSP                                                     │
│  Executes: fetch('http://127.0.0.1:8000/act', { method: 'POST' })      │
└────────────────────────────┬───────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASTAPI REASONING GATEWAY [server/app.py]                              │
│                                                                        │
│  1. Pydantic Validation: extra="forbid" (Rejects 'value' field with 422)│
│  2. Prompt Injection Guard: _scan_labels_for_injection() (400 on trap) │
│  3. Model Dispatch: [server/vlm_client.py]                             │
│       ├── MockVLMClient (Default heuristic / ValueRef rule engine)     │
│       └── OllamaVLMClient (HTTP POST to localhost:11434/api/generate)  │
│  4. Returns: { action, target, valueRef, confidence, reasoning }       │
└────────────────────────────┬───────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LOCAL ACTION EXECUTION BOUNDARY [content.js & core/]                   │
│                                                                        │
│  [core/action-resolver.js] (resolveTarget: Jaccard overlap / data-id)  │
│       │                                                                │
│       ▼                                                                │
│  [core/risk-classifier.js] (classifyActionRisk: SAFE/SENSITIVE/HIGH)   │
│       │                                                                │
│       ▼                                                                │
│  [core/action-executor.js] (executeAction)                             │
│       ├── If valueRef: [core/secret-vault.js] resolveSecret locally    │
│       ├── If raw value on sensitive element: REJECT / BLOCK            │
│       └── Dispatches native DOM events: focus -> value -> input/change │
│       │                                                                │
│       ▼                                                                │
│  [core/security-ledger.js] (recordEvent -> persists secretId only)     │
│       │                                                                │
│       ▼                                                                │
│  Re-Perceive & Loop (MAX_STEPS = 5 in agent-orchestrator.js)           │
└────────────────────────────────────────────────────────────────────────┘
```
