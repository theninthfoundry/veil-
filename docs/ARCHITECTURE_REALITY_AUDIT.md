# VEIL — Architecture Reality & Forensic Repository Audit

**Document Status**: Official Forensic Audit & Baseline Ground Truth  
**Target Repository**: `https://github.com/theninthfoundry/veil-` (`d:\veil`)  
**Auditor**: Lead Systems & Security Architecture Authority  
**Date**: September 2, 2026 (Updated Baseline)  
**Standard**: Zero-Trust Code-Level Truth Verification  

---

## Executive Summary

VEIL's core security thesis:
> *"The reasoning model can observe sanitized context and propose actions, but it can never directly access protected values or directly control the browser."*

This is an exceptional and vital foundation for AI browser agents. However, a rigorous code-level audit reveals that while the **DOM sanitization, ValueRef vault, and pre-flight privacy firewall** are genuine executable protections, critical parts of the architecture currently diverge between documentation claims and source-code reality:

1. **Visual OCR**: Benchmark suites evaluate synthetic fixture markers (`_pixelTextRegions`, `_renderedPixelText`, `data-canvas-text`) rather than end-to-end pixel bitmaps in the test pipeline.
2. **Privacy Vulnerability in Redaction UI**: [`content/redactor.js`](file:///d:/veil/veil-extension/content/redactor.js#L108) copies raw sensitive field values directly into the webpage's DOM attribute `data-veil-reveal`.
3. **In-Page Approval Boundary**: [`content/high-risk-confirmation.js`](file:///d:/veil/veil-extension/content/high-risk-confirmation.js) injects security-critical confirmation dialogs directly into the untrusted webpage DOM via `innerHTML`.
4. **Split Decision Authorities**: [`core/policy-engine.js`](file:///d:/veil/veil-extension/core/policy-engine.js) and [`core/risk-classifier.js`](file:///d:/veil/veil-extension/core/risk-classifier.js) operate as two competing policy engines rather than one unified Policy Decision Point (PDP).
5. **Simulated Workflow Engine**: [`core/workflow-runner.js`](file:///d:/veil/veil-extension/core/workflow-runner.js) uses hardcoded `setTimeout()` loops and simulated step sequences rather than executing through the real [`core/agent-orchestrator.js`](file:///d:/veil/veil-extension/core/agent-orchestrator.js) runtime.
6. **Red-Team Short-Circuits**: [`benchmark/run-30-attacks.js`](file:///d:/veil/veil-extension/benchmark/run-30-attacks.js#L140-L150) hardcodes `defenseTriggered = true` for schema injection attacks 20–27 without calling actual production validators.
7. **Gateway Perimeter Weakness**: [`server/app.py`](file:///d:/veil/veil-extension/server/app.py#L50) exposes `allow_origins=["*"]` without an installation-bound token handshake.
8. **Hash Mislabeling**: [`core/network-forensics.js`](file:///d:/veil/veil-extension/core/network-forensics.js#L31) runs a djb2 integer hash but prepends the prefix `sha256_`.

---

## A. Current Repository Tree

```
d:\veil\
├── .audit/                             # Forensic audit working records
├── docs/                               # Architecture and evidence documentation (40+ docs)
├── real-lab/                           # JSDOM fixture laboratory (30 cases)
├── scripts/
│   ├── commit-history-builder.js       # Atomic git commit generator
│   └── quick-commits.js                # Rapid commit helper
├── test.js                             # Zero-trust master verification runner
├── visual-ocr.js                       # Root re-export entrypoint
├── push_commits.bat / quick_commits.*  # Push and commit execution batch scripts
└── veil-extension/                     # Chrome Extension (Manifest V3)
    ├── manifest.json                   # MV3 Manifest
    ├── background/
    │   └── background.js               # Service worker: transport & tab state
    ├── core/
    │   ├── action-executor.js          # DOM event dispatcher (click, type, scroll)
    │   ├── action-resolver.js          # Semantic element matching (Jaccard similarity)
    │   ├── agent-orchestrator.js       # Multi-step autonomous agent loop
    │   ├── comparison-builder.js       # Raw vs Sanitized diff serializer
    │   ├── context-builder.js          # Safe structural context builder (no values)
    │   ├── detector.js                 # Span-arbitrated regex PII engine + Luhn validator
    │   ├── dom-utils.js                # TreeWalker traversal & open Shadow DOM handling
    │   ├── failure-analyzer.js         # Runtime failure classifier
    │   ├── mutation-guard.js           # TOCTOU pre-execution target revalidator
    │   ├── network-forensics.js        # Outbound JSON auditor & canary scanner
    │   ├── policy-engine.js            # Declarative action policy rules
    │   ├── privacy-audit.js            # Pre-flight serialization regex checker
    │   ├── risk-classifier.js          # 4-tier action risk categorizer
    │   ├── secret-vault.js             # In-memory ValueRef credential store
    │   ├── security-ledger.js          # Session storage audit event chain
    │   ├── session.js                  # Session state machine
    │   ├── visual-ocr.js               # On-device visual OCR perception engine
    │   └── workflow-runner.js          # Canonical golden workflow runner
    ├── content/
    │   ├── content.js                  # Content script perception-action loop
    │   ├── high-risk-confirmation.js   # In-page confirmation modal (innerHTML)
    │   ├── inspector-overlay.js        # In-page Live Inspector HUD
    │   ├── redactor.js                 # In-page .veil-bar blackout overlay
    │   └── vision-fallback.js          # Transformers.js face detection & attribute scanner
    ├── popup/                          # Extension toolbar popup HUD
    ├── command-center/                 # Mission control UI dashboard
    ├── proof/                          # Interactive security proof laboratory
    ├── lab/                            # Live tab laboratory studio
    ├── server/                         # FastAPI Gateway
    │   ├── app.py                      # POST /act endpoint, CORS, prompt injection guard
    │   ├── vlm_client.py               # Ollama client & MockVLMClient fallback
    │   ├── test_phase1.py              # Pytest gateway test suite
    │   └── requirements.txt            # Python dependencies
    ├── benchmark/                      # Automated benchmark & certification suites (29 files)
    ├── test-pages/                     # 16 local HTML test fixtures (Cases 001-010 + canvas)
    └── vendor/
        └── transformers.web.min.js     # Transformers.js client bundle (431KB)
```

---

## B. Runtime Entrypoints

| Subsystem | Entrypoint File | Invocation Mechanism | Current Real Authority |
|---|---|---|---|
| **Chrome Extension Service Worker** | `background/background.js` | Browser extension event lifecycle | Owns `fetch('http://127.0.0.1:8000/act')`, `VEIL_STATS`, `VEIL_FETCH_IMAGE_BLOB` |
| **Chrome Extension Content Script** | `content/content.js` | Injected into `http://*`, `https://*`, `file:///*` | Drives `scanAndRedact()`, DOM mutations, and task loop |
| **Reasoning Server Gateway** | `server/app.py` | Uvicorn ASGI (`uvicorn app.py:app --port 8000`) | Validates Pydantic `ElementIn(extra="forbid")`, calls VLM |
| **Master Test Suite** | `test.js` | `node test.js` (Root CLI) | Executes 7 suites with fail-closed non-zero exit codes |
| **Real-Web Evaluation Suite** | `benchmark/run-real-cases.js` | `node veil-extension/benchmark/run-real-cases.js` | Evaluates Cases 001–010 against local HTTP server (Port 3000) |
| **UI Mission Control** | `command-center/command-center.html` | Extension Tab via `chrome-extension://` | Renders HUD, state controls, and event log |

---

## C. Dependency Graph

```
[Webpage DOM]
      │
      ▼
[content/content.js]
      ├──► [core/dom-utils.js] (TreeWalker, accessibility)
      ├──► [core/detector.js] (Regex, Luhn, span arbitration)
      ├──► [core/visual-ocr.js] (Visual OCR / canvas raster scan)
      ├──► [content/vision-fallback.js] (Face detection via Transformers.js)
      ├──► [content/redactor.js] (Renders .veil-bar overlays)
      ├──► [core/context-builder.js] (Safe JSON, strips .value)
      ├──► [core/privacy-audit.js] (Pre-flight regex check)
      │
      ▼ (chrome.runtime.sendMessage)
[background/background.js]
      │
      ▼ (HTTP POST /act)
[server/app.py]
      ├──► [Prompt Injection Scanner] (Regex check)
      ├──► [Pydantic Validation] (extra="forbid")
      └──► [server/vlm_client.py] ──► [Ollama /api/generate OR MockVLMClient]
      │
      ▼ (HTTP Response JSON Action)
[content/content.js]
      ├──► [core/action-resolver.js] (Jaccard DOM resolution)
      ├──► [core/risk-classifier.js] (SAFE vs HIGH_RISK)
      ├──► [content/high-risk-confirmation.js] (Human modal if HIGH_RISK)
      ├──► [core/mutation-guard.js] (Pre-execution TOCTOU check)
      ├──► [core/secret-vault.js] (In-memory ValueRef resolution)
      └──► [core/action-executor.js] (Synthetic event dispatch: click/type)
```

---

## D. Security Trust Boundaries

```
╔══════════════════════════════════════════════════════════════════════════╗
║                       UNTRUSTED DOMAIN (External)                        ║
╠══════════════════════════════════════════════════════════════════════════╣
║ • Webpage DOM, Third-Party Scripts, Hostile CSS, Hidden Elements         ║
║ • Remote Multimodal Reasoning Model (Ollama / Cloud VLM)                 ║
║ • Remote Adversarial Injections & Dynamic Mutation Traps                 ║
╚══════════════════════════════════════════════════════════════════════════╝
                                    │
                                    ▼ (Sanitized Context / Strict Schema)
╔══════════════════════════════════════════════════════════════════════════╗
║                     SEMI-TRUSTED DOMAIN (Page Isolated)                  ║
╠══════════════════════════════════════════════════════════════════════════╣
║ • Content Script Context (Isolated JS World, but shares Page DOM)        ║
║ • ⚠️ VULNERABILITY: In-Page High-Risk Modal (Rendered in Page DOM)       ║
║ • ⚠️ VULNERABILITY: Redaction Overlay data-veil-reveal (Mirrors Secrets)  ║
╚══════════════════════════════════════════════════════════════════════════╝
                                    │
                                    ▼ (IPC Message Channel)
╔══════════════════════════════════════════════════════════════════════════╗
║                   TRUSTED KERNEL DOMAIN (Device Exclusive)               ║
╠══════════════════════════════════════════════════════════════════════════╣
║ • Extension Service Worker (background/background.js)                    ║
║ • In-Memory Secret Vault (core/secret-vault.js)                          ║
║ • Pre-Flight Network Gate & Canary Interceptor (network-forensics.js)   ║
║ • Policy Engine & TOCTOU Mutation Revalidator (mutation-guard.js)        ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## E. Actual Data Flow

1. **Perception**: `dom-utils.js` traverses the DOM tree via TreeWalker, extracting tags, roles, and accessible labels. Concurrently, `visual-ocr.js` scans raster elements (`canvas`, `img`, `video`, `svg`).
2. **PII Interception**: `detector.js` checks text against regex patterns (Email, Phone, Card, Aadhaar, PAN) and Luhn algorithm.
3. **In-Page Masking**: `redactor.js` injects `.veil-bar` `<div>` tags directly over sensitive coordinates. *(Defect: Copies raw value to `dataset.veilReveal`)*.
4. **Context Sanitization**: `context-builder.js` constructs structural JSON:
   ```json
   { "id": "el-0", "tag": "input", "type": "password", "label": "Master Password", "sensitive": true }
   ```
   **Field `.value` is strictly omitted**.
5. **Pre-Flight Firewall**: `privacy-audit.js` and `network-forensics.js` inspect the outbound JSON string for raw card numbers and 8 synthetic canary tokens.
6. **Network Transmission**: `background.js` dispatches the audited payload to `POST /act`.

---

## F. Actual Action Flow

1. **Model Proposal**: Server returns an action proposal JSON:
   ```json
   { "action": "type", "target": { "id": "el-0" }, "valueRef": "LOCAL_SECRET_PASS" }
   ```
2. **Target Resolution**: `action-resolver.js` re-resolves the target on the live DOM using ID match or Jaccard similarity ($\ge 0.3$).
3. **Risk Classification**: `risk-classifier.js` inspects action type and description. If monetary, deletion, or transfer, marks `HIGH_RISK`.
4. **Human Confirmation**: If `HIGH_RISK`, `high-risk-confirmation.js` renders a modal in the webpage DOM awaiting an `isTrusted` click.
5. **TOCTOU Revalidation**: `mutation-guard.js` verifies element connectivity, disabled state, and word overlap. Aborts if button text changed (e.g. price swap).
6. **Secret Vault Injection**: `secret-vault.js` verifies the current document origin against whitelist; resolves abstract `LOCAL_SECRET_*` token in memory.
7. **Local Execution**: `action-executor.js` dispatches trusted synthetic DOM events (`focus`, `input`, `change`, `click`).

---

## G. Actual Network Flow

- Content script **never calls `fetch()` directly**. All requests message `background.js`.
- `background.js` calls `http://127.0.0.1:8000/act`.
- `server/app.py` passes payload to `vlm_client.py`.
- `vlm_client.py` makes HTTP POST to Ollama (`http://localhost:11434/api/generate`).
- In `VEIL_EVIDENCE_MODE=true`, offline Ollama returns HTTP 503. In default dev mode, falls back to `MockVLMClient`.

---

## H. Current Benchmark Flow

- Test suites in `veil-extension/benchmark/` are executed via Node.js CLI using `JSDOM`.
- They simulate browser DOM environments and evaluate individual JavaScript modules directly.
- **Limitation**: While fast and deterministic, they test static JSDOM trees rather than a live multi-process Chromium browser with real layout engines, GPU rendering, and extension sandbox boundaries.

---

## I. Demo-Only Code

- [`proof/proof.html`](file:///d:/veil/veil-extension/proof/proof.html): Interactive animation loop showing synthetic pass states via timer intervals.
- [`lab/lab.js`](file:///d:/veil/veil-extension/lab/lab.js): Contains a static `CASE_DATABASE` with pre-canned responses.
- [`test-apps/`](file:///d:/veil/veil-extension/test-apps/): Mock web stores built for visual demonstration.

---

## J. Mock-Only Code

- `MockVLMClient` in [`server/vlm_client.py`](file:///d:/veil/veil-extension/server/vlm_client.py#L320-L400): Keyword-based rule engine returning pre-scripted JSON responses when Ollama is offline.
- `_pixelTextRegions` & `_renderedPixelText` hooks in [`core/visual-ocr.js`](file:///d:/veil/veil-extension/core/visual-ocr.js): Object properties injected by unit tests to bypass OCR model execution.
- [`core/workflow-runner.js`](file:///d:/veil/veil-extension/core/workflow-runner.js): Uses `setTimeout(r, 200)` to simulate execution latency.

---

## K. Hardcoded / Synthetic Measurements

1. **Red Team Suite (`run-30-attacks.js`)**: Cases 20–27 (schema injection, coordinate injection, shell injection, malformed JSON) execute `defenseTriggered = true` without calling production schema validation logic.
2. **Hash Algorithm Label (`network-forensics.js`)**: Prepends `sha256_` to a 32-bit djb2 integer hash.
3. **Legacy Ablation Script (`run-ablation-study.js`)**: Prints hardcoded strings `'84 MB'` and `'185.0 ms'` from older benchmark runs.

---

## L. Duplicate Implementations

1. **Visual OCR**: Root [`visual-ocr.js`](file:///d:/veil/visual-ocr.js) vs extension [`core/visual-ocr.js`](file:///d:/veil/veil-extension/core/visual-ocr.js). *(Now unified in v2.1.0)*.
2. **Policy Evaluation**: [`core/policy-engine.js`](file:///d:/veil/veil-extension/core/policy-engine.js) (declarative rules) vs [`core/risk-classifier.js`](file:///d:/veil/veil-extension/core/risk-classifier.js) (hardcoded risk rules).
3. **Workflow Execution**: [`core/workflow-runner.js`](file:///d:/veil/veil-extension/core/workflow-runner.js) (simulation runner) vs [`core/agent-orchestrator.js`](file:///d:/veil/veil-extension/core/agent-orchestrator.js) (real autonomous agent loop).
4. **Visual Perception**: [`content/vision-fallback.js`](file:///d:/veil/veil-extension/content/vision-fallback.js) (face detection + attribute check) vs [`core/visual-ocr.js`](file:///d:/veil/veil-extension/core/visual-ocr.js) (pixel OCR).

---

## M. Stale Documentation

- Claims of `"100.00 / 100.00 SIH Score"` in truth matrices.
- Claims that Visual OCR was a full compiled WebAssembly neural engine when the benchmark exercised synthetic metadata markers.
- Claims that End-to-End latency is `4.71 ms` (which is strictly client-side perception time, ignoring 1.5–3.0s VLM neural inference).

---

## N. Known Security Flaws

1. **DOM Attribute Secret Leakage**:
   - *File*: [`veil-extension/content/redactor.js`](file:///d:/veil/veil-extension/content/redactor.js#L108-L111)
   - *Flaw*: Copies unmasked sensitive values into `bar.dataset.veilReveal`.
   - *Risk*: Any hostile script on the webpage can read `document.querySelectorAll('.veil-bar')` and harvest all sensitive data from the DOM attribute.
2. **In-Page Human Confirmation Modal**:
   - *File*: [`veil-extension/content/high-risk-confirmation.js`](file:///d:/veil/veil-extension/content/high-risk-confirmation.js#L110-L160)
   - *Flaw*: Renders the high-risk authorization dialog directly into the webpage's DOM using `innerHTML` and interpolates untrusted page text.
   - *Risk*: A malicious webpage can use CSS `pointer-events: none`, clickjacking overlays, or DOM manipulation to spoof, suppress, or trick user confirmation.
3. **Permissive Gateway CORS**:
   - *File*: [`veil-extension/server/app.py`](file:///d:/veil/veil-extension/server/app.py#L50)
   - *Flaw*: `allow_origins=["*"]`, `allow_headers=["*"]`.
   - *Risk*: Any website visited in the user's browser can issue fetch requests to `http://localhost:8000/act` and interact with the local gateway.
4. **Plaintext Secrets in Vault Code**:
   - *File*: [`veil-extension/core/secret-vault.js`](file:///d:/veil/veil-extension/core/secret-vault.js#L15-L25)
   - *Flaw*: Embeds default plaintext passwords (`SuperSecretPass#99`, `4111 1111 1111 1111`) directly in source code.
5. **Fragile Element IDs**:
   - *File*: [`veil-extension/core/context-builder.js`](file:///d:/veil/veil-extension/core/context-builder.js#L36)
   - *Flaw*: Assigns sequential IDs `el-${counter}` based on traversal index. A dynamic DOM insertion shifts all IDs, invalidating target resolution.

---

## O. Known Browser Compatibility Limitations

1. **Closed Shadow DOM**: Elements inside `{ mode: "closed" }` shadow roots cannot be accessed by browser extension content scripts by browser security design.
2. **Cross-Origin Iframes**: Browsers enforce the Same-Origin Policy; content scripts cannot traverse into cross-origin iframe DOM trees without matching URL pattern injection.
3. **CORS-Tainted Canvas**: Calling `canvas.toDataURL()` on cross-origin images without CORS headers throws a `SecurityError`. Handled via background service worker proxy.

---

## P. Capability Verification Status

| Component / Subsystem | Implementation File | Verified Ground Truth Status | Technical Reality |
|---|---|:---:|---|
| **DOM TreeWalker** | `core/dom-utils.js` | **VERIFIED** | Real native DOM traversal, extracts semantic tags and labels. |
| **Open Shadow DOM** | `core/dom-utils.js` | **VERIFIED (Open Only)** | Recursively inspects `element.shadowRoot` for open roots. |
| **Span-Arbitrated Regex** | `core/detector.js` | **VERIFIED** | Real regex with Luhn checksum for cards and format checks. |
| **Context Sanitizer** | `core/context-builder.js` | **VERIFIED** | Strips `.value` property completely from serialized JSON. |
| **Pre-Flight Privacy Audit** | `core/privacy-audit.js` | **VERIFIED** | Intercepts JSON strings and validates absence of secrets before transmission. |
| **In-Memory ValueRef Vault** | `core/secret-vault.js` | **PARTIALLY VERIFIED** | Origin binding verified; stores static plaintext secrets in source. |
| **TOCTOU Mutation Guard** | `core/mutation-guard.js` | **VERIFIED** | Re-resolves targets; checks Jaccard overlap and connectivity. |
| **Semantic Action Resolver** | `core/action-resolver.js` | **VERIFIED** | Matches descriptions to live DOM elements using word overlap ($\ge 0.3$). |
| **Action Risk Classifier** | `core/risk-classifier.js` | **VERIFIED** | Categorizes monetary payments, fund transfers, and deletions. |
| **Human Confirmation Gate** | `content/high-risk-confirmation.js` | **VULNERABLE** | Works functionally, but renders in page DOM via `innerHTML`. |
| **Redaction Overlay** | `content/redactor.js` | **VULNERABLE** | Positions `.veil-bar` correctly, but leaks secret into `data-veil-reveal`. |
| **On-Device Pixel OCR** | `core/visual-ocr.js` | **PARTIALLY VERIFIED** | Real Transformers.js pipeline exists; test fixtures rely on mock properties. |
| **Face Detection Biometrics** | `content/vision-fallback.js` | **VERIFIED** | Real Transformers.js `owlvit-base-patch32` wrapper with try/catch fallback. |
| **Ollama VLM Client** | `server/vlm_client.py` | **VERIFIED** | Real HTTP connection to Ollama; strict evidence mode fails closed. |
| **Server Schema Firewall** | `server/app.py` | **VERIFIED** | Pydantic `extra="forbid"` rejects extra fields with HTTP 422. |
| **FastAPI Gateway CORS** | `server/app.py` | **VULNERABLE** | `allow_origins=["*"]` allows any web page to contact localhost port 8000. |
| **Golden Workflow Runner** | `core/workflow-runner.js` | **SIMULATED** | Uses `setTimeout()` delays instead of driving real autonomous loop. |
| **Red Team Defense Suite** | `benchmark/run-30-attacks.js` | **SIMULATED (Cases 20-27)** | Schema injection tests hardcode `defenseTriggered = true`. |
| **Tamper-Evident Ledger** | `core/security-ledger.js` | **PARTIALLY VERIFIED** | In-memory/session storage array; not a true cryptographic hash chain. |
| **Master Test Runner** | `test.js` | **VERIFIED** | Enforces fail-closed non-zero exit codes across 7 test suites. |

---

## Q. Proposed Final Architecture (The VEIL Security Kernel)

```
veil-extension/
├── core/
│   ├── kernel/
│   │   ├── runtime.js              # Canonical unified execution engine
│   │   ├── authority.js            # Security domain enforcement (assertAuthority)
│   │   ├── capability.js           # Ephemeral, single-use Capability tokens
│   │   ├── policy.js               # Unified Policy Decision Point (PDP)
│   │   ├── session.js              # Durable session state machine (chrome.storage.session)
│   │   └── ledger.js               # Cryptographically chained event ledger (WebCrypto)
│   │
│   ├── perception/
│   │   ├── scene-graph.js          # Unified Scene Graph representation
│   │   ├── dom.js                  # TreeWalker, semantic extraction, open Shadow DOM
│   │   ├── visual-ocr.js           # Real on-device WASM/Transformers OCR engine
│   │   └── fusion.js               # Visual + DOM Sensor Fusion & Disagreement Gate
│   │
│   ├── privacy/
│   │   ├── classifier.js           # P0-P8 Data Classification Engine
│   │   ├── detector.js             # Span-arbitrated regex + Luhn checks
│   │   ├── sanitizer.js            # Structural JSON builder (zero values)
│   │   └── minimizer.js            # Task-focused context minimization
│   │
│   ├── action/
│   │   ├── protocol.js             # Strict typed Action Envelope & Schemas
│   │   ├── resolver.js             # Target resolution & cryptographic fingerprinting
│   │   ├── guard.js                # TOCTOU pre-execution mutation revalidator
│   │   └── executor.js             # Controlled synthetic DOM event dispatcher
│   │
│   └── transport/
│       ├── gateway.js              # VEILTransport.send() - Single network choke point
│       └── authentication.js       # Local gateway session handshake & token management
```

---

## R. 12-Phase Migration & Execution Roadmap

```
PHASE 1: Forensic Audit & Truth Alignment (COMPLETED HERE)
   ├── Deliver docs/ARCHITECTURE_REALITY_AUDIT.md
   └── Ground all claims in source code reality

PHASE 2: Privacy Vulnerability Remediation
   ├── Remove raw secret mirroring from content/redactor.js (strip data-veil-reveal)
   └── Lock down server/app.py CORS (remove allow_origins=["*"], require local auth token)

PHASE 3: Security Kernel & Authority Unification
   ├── Merge risk-classifier.js and policy-engine.js into one Policy Decision Point
   ├── Implement ephemeral single-use Capability Tokens (replacing raw ValueRef)
   └── Move High-Risk Human Approval to extension-owned UI surface (Side Panel / Popup)

PHASE 4: Perception Engine & Sensor Fusion
   ├── Connect real visible-tab capture and on-device WASM OCR to pixel buffers
   ├── Build PerceptionGraph and DOM+Vision Sensor Fusion (disagreement gate)
   └── Implement Context Minimization Engine (reduce token exposure by >80%)

PHASE 5: Canonical Runtime Consolidation
   ├── Retire simulated workflow-runner.js; route golden workflows through VEILRuntime
   ├── Implement durable session state machine in chrome.storage.session
   └── Replace fragile el-${counter} IDs with cryptographic target fingerprints

PHASE 6: Transport & Ledger Hardening
   ├── Establish VEILTransport.send() as sole network choke point
   ├── Implement real WebCrypto cryptographic event chaining in security ledger
   └── Fix hashString() in network-forensics.js (remove misleading sha256_ prefix)

PHASE 7: Grounded Red-Team & Certification Harness
   ├── Rewrite run-30-attacks.js to route all 30 vectors through real production guards
   └── Build unified 'npm run certify' command verifying real Chromium execution
```
