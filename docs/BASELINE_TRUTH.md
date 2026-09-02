# VEIL — Phase 0 Engineering Baseline & Immutable Truth

**Document Date**: September 2, 2026  
**Auditor**: Forensic Assessment & Verification Engine  
**Standard**: Zero-Trust Empirical Verification (Code, Runtime, Network, Security Boundaries)  
**Status**: PHASE 0 BASELINE ESTABLISHED — REPOSITORY FROZEN FOR EVIDENCE SPRINT

---

## 1. Environment & Repository Snapshot

| Parameter | Observed Value | Verification Method |
|---|---|---|
| **Git Commit** | `84b577a0c959f651f0bd2c55a61775b062d97d7b` | `git rev-parse HEAD` |
| **Node.js Runtime** | `v22.22.3` | `node -v` |
| **Python Runtime** | `Python 3.13.5` | `python --version` |
| **Operating System** | `Windows (10.0.26100)` | System telemetry |
| **Local Ollama Service** | `OFFLINE` (`localhost:11434` timed out) | `httpx.get("http://localhost:11434/api/tags")` |
| **Installed Local Models** | None online | Probed localhost:11434 |
| **Active Reasoner Backend** | `MockVLMClient` (Deterministic Rule Reasoner) | `/health` endpoint telemetry |

---

## 2. Complete Repository Categorization

### 2.1 Production Core Extension (`veil-extension/core/`)
- [`core/dom-utils.js`](file:///d:/veil/veil-extension/core/dom-utils.js): DOM tree traversal, text normalization, interactive element identification.
- [`core/detector.js`](file:///d:/veil/veil-extension/core/detector.js): Span-arbitrated regex engine (Aadhaar, PAN, Card with Luhn, Email, Phone, Passwords).
- [`core/context-builder.js`](file:///d:/veil/veil-extension/core/context-builder.js): Structural JSON generation with `data-veil-id` (strictly omits `.value`).
- [`core/privacy-audit.js`](file:///d:/veil/veil-extension/core/privacy-audit.js): Pre-flight regex firewall scanning serialized outbound JSON and task prompts.
- [`core/secret-vault.js`](file:///d:/veil/veil-extension/core/secret-vault.js): In-memory ValueRef vault with strict domain whitelisting (`localhost`, `127.0.0.1`).
- [`core/action-resolver.js`](file:///d:/veil/veil-extension/core/action-resolver.js): Fuzzy Jaccard word-overlap target matcher (score >= 0.3).
- [`core/risk-classifier.js`](file:///d:/veil/veil-extension/core/risk-classifier.js): 4-tier action risk classifier (SAFE, SENSITIVE, HIGH_RISK, BLOCKED).
- [`core/action-executor.js`](file:///d:/veil/veil-extension/core/action-executor.js): Native DOM event dispatcher and local secret injector.
- [`core/security-ledger.js`](file:///d:/veil/veil-extension/core/security-ledger.js): Scrubbed event timeline logging in session storage.
- [`core/agent-orchestrator.js`](file:///d:/veil/veil-extension/core/agent-orchestrator.js): Multi-step FSM loop (`MAX_STEPS = 5`).
- [`core/failure-analyzer.js`](file:///d:/veil/veil-extension/core/failure-analyzer.js): DOM mutation and state drift diagnostic analyzer.

### 2.2 Content, Background & UI Layers
- [`content/content.js`](file:///d:/veil/veil-extension/content/content.js): Content script orchestrator, `MutationObserver` listener, message dispatcher.
- [`content/redactor.js`](file:///d:/veil/veil-extension/content/redactor.js): Non-destructive fixed CSS blackout layer (`#veil-redaction-layer`).
- [`content/inspector-overlay.js`](file:///d:/veil/veil-extension/content/inspector-overlay.js): In-page HUD overlay.
- [`content/vision-fallback.js`](file:///d:/veil/veil-extension/content/vision-fallback.js): Offline raster/canvas heuristic PII detector and Transformers.js face detector stub.
- [`background/background.js`](file:///d:/veil/veil-extension/background/background.js): Service worker network proxy to FastAPI gateway.
- [`popup/popup.js`](file:///d:/veil/veil-extension/popup/popup.js): Privacy Observatory popup interface.
- [`lab/lab.js`](file:///d:/veil/veil-extension/lab/lab.js): Interactive Evaluation Studio with live tab messaging & dynamic DOM parser.
- [`proof/proof.js`](file:///d:/veil/veil-extension/proof/proof.js): Side-by-side comparison proof page.

### 2.3 Reasoning Server Gateway (`veil-extension/server/`)
- [`server/app.py`](file:///d:/veil/veil-extension/server/app.py): FastAPI gateway with Pydantic `extra="forbid"`, prompt injection scanner, and health endpoint.
- [`server/vlm_client.py`](file:///d:/veil/veil-extension/server/vlm_client.py): Auto-probing Ollama client with resilient fallback to `MockVLMClient`.

### 2.4 Empirical Benchmark & Test Harnesses
- [`benchmark/run-benchmark.js`](file:///d:/veil/veil-extension/benchmark/run-benchmark.js): 15-fixture count-based PII precision/recall evaluator.
- [`benchmark/run-resolver-test.js`](file:///d:/veil/veil-extension/benchmark/run-resolver-test.js): 14-assertion semantic action resolver test suite.
- [`benchmark/run-security-test.js`](file:///d:/veil/veil-extension/benchmark/run-security-test.js): 12-assertion security, vault, and invariant test suite.
- [`benchmark/run-adversarial-attacks.js`](file:///d:/veil/veil-extension/benchmark/run-adversarial-attacks.js): 7-attack penetration defense suite.
- [`benchmark/run-ablation-study.js`](file:///d:/veil/veil-extension/benchmark/run-ablation-study.js): 4-configuration ablation study with real heap and latency measurements.
- [`benchmark/run-all-tests.js`](file:///d:/veil/veil-extension/benchmark/run-all-tests.js): Master runner executing all 5 suites sequentially.
- [`real-lab/run-all.js`](file:///d:/veil/real-lab/run-all.js): 10-case real-world multi-mode taxonomy evaluator.

---

## 3. Data Entry, Egress, and Trust Boundaries

```
                      LIVE WEBPAGE (DOM + Canvas + Images)
                                         │
                                         ▼ [Local Read]
                      LOCAL PERCEPTION AUTHORITY (Device)
                      ├── DOM TreeWalker (Extracts tags, labels, placeholders)
                      └── Canvas / Raster Scanner (Inspects 2D image data)
                                         │
                                         ▼ [Element References]
                      LOCAL PRIVACY AUTHORITY (Device)
                      ├── Detector (Aadhaar, PAN, CC Luhn, Email, Phone Regex)
                      ├── Context Builder (Omits .value; assigns data-veil-id)
                      └── Privacy Audit (Regex scan on outbound JSON & task string)
                                         │
                                         ▼ [Sanitized Structural Skeleton JSON Only]
               ═════════════════════════════════════════════════════════
                 DEVICE TRUST BOUNDARY (Tested Payloads: 0 Leaks)
               ═════════════════════════════════════════════════════════
                                         │
                                         ▼ [HTTP POST /act]
                      REASONING AUTHORITY (FastAPI Server / Ollama)
                      ├── Server Schema Validation (extra="forbid")
                      ├── Prompt Injection Check (Label scanning)
                      └── Reasoner (Proposes Action: e.g. type LOCAL_SECRET_01)
                                         │
                                         ▼ [Semantic Action Proposal JSON]
               ═════════════════════════════════════════════════════════
                 DEVICE TRUST BOUNDARY (Advisory Proposal Only)
               ═════════════════════════════════════════════════════════
                                         │
                                         ▼
                      LOCAL ACTION AUTHORITY (Device)
                      ├── Risk Classifier (SAFE, SENSITIVE, HIGH_RISK, BLOCKED)
                      ├── Action Resolver (Fuzzy Jaccard Match on live DOM)
                      ├── Secret Vault (Resolves LOCAL_SECRET_01 locally)
                      └── Action Executor (Dispatches native DOM events)
                                         │
                                         ▼ [DOM Event Execution]
                                 MUTATED WEBPAGE
                                         │
                                         ▼ [Mandatory Re-Perception]
                      PERCEPTION AUTHORITY (FSM Loop <= 5 Steps)
```

---

## 4. Current Test & Benchmark Results (Canonical Baseline Run)

### 4.1 Master 5-Suite Benchmark (`npm test` / `run-all-tests.js`)
- **Execution Runtime**: `63,629 ms`
- **Suite 1: PII Precision & Recall (15 Fixtures, 42 Sensitive Items)**:
  - Aadhaar: Precision 100.0%, Recall 100.0% (tp=3, fp=0, fn=0)
  - Address: Precision 100.0%, Recall 100.0% (tp=3, fp=0, fn=0)
  - Credit Card (Luhn): Precision 100.0%, Recall 100.0% (tp=4, fp=0, fn=0)
  - Email: Precision 100.0%, Recall 100.0% (tp=12, fp=0, fn=0)
  - Name: Precision 100.0%, Recall 100.0% (tp=5, fp=0, fn=0)
  - PAN: Precision 100.0%, Recall 100.0% (tp=3, fp=0, fn=0)
  - Password: Precision 100.0%, Recall 100.0% (tp=3, fp=0, fn=0)
  - Phone: Precision 100.0%, Recall 100.0% (tp=9, fp=0, fn=0)
  - **Overall**: Precision 100.0%, Recall 100.0% across the 15 labeled structured-DOM fixtures.
- **Suite 2: Semantic Action Resolution & Safety**: 14 / 14 assertions passed.
- **Suite 3: Security Invariants & Vault Defense**: 12 / 12 assertions passed.
- **Suite 4: Adversarial Attack Penetration**: 7 / 7 attacks blocked.
- **Suite 5: Empirical Ablation Study (Real Heap & Latency)**:
  - Config A (DOM Attributes Only): Precision 100.0%, Recall 35.7%, F1 52.6%, Latency 4.78 ms, Heap 83.1 MB.
  - Config B (DOM + Regex Engine): Precision 100.0%, Recall 100.0%, F1 100.0%, Latency 5.97 ms, Heap 86.0 MB.
  - Config C (DOM + Canvas Raster Scanner): Precision 100.0%, Recall 35.7%, F1 52.6%, Latency 4.39 ms, Heap 108.2 MB.
  - Config D (Full Multi-Signal): Precision 100.0%, Recall 100.0%, F1 100.0%, Latency 6.13 ms, Heap 133.9 MB.

### 4.2 Real-Lab 10-Case Taxonomy Suite (`node real-lab/run-all.js`)
- **Observe Mode**: 10 / 10 cases parsed and categorized (Mean latency: ~5.3 ms).
- **Simulate Mode**: 3 / 3 simulations executed with 0 DOM clicks.
- **Live Agent Mode**: 3-step autonomous loop executed with local ValueRef resolution and 0 leaked credentials.

---

## 5. Known Mocks, Hardcoded Values & Unproven Claims

| Item | Current Status | Forensic Reality | Target Evidence Phase |
|---|---|---|---|
| **Ollama VLM Reasoning** | `MOCKED` (Fallback) | `MockVLMClient` runs rule heuristics because Ollama is offline. | Phase 1 (Real Ollama Evidence) |
| **Network Non-Egress** | `PARTIAL` | Verified in tested JSON serialization; complete physical socket boundary unproven. | Phase 2 (Network Packet Proof) |
| **Visual OCR Perception** | `PARTIAL` | Canvas/raster heuristic scanner implemented; deep character OCR unproven. | Phase 3 (Pixel-Only Visual Test) |
| **Shadow DOM / iframes** | `MISSING` | Traversal stops at document root; cross-origin frames not pierced. | Phase 4 (Browser Tree Perception) |
| **High-Risk Confirmation** | `PARTIAL` | Risk classified in code; visual in-page modal dialog missing. | Phase 5 (Local Action Authority) |
| **Free-Text Name/Address NER** | `PARTIAL` | Detected on form inputs; arbitrary paragraph free-text NER unproven. | Phase 6 (Free-Text Privacy Engine) |
| **Dynamic SPA Mutation** | `PARTIAL` | FSM aborts on mismatch; high-frequency Virtual DOM stress unproven. | Phase 7 (SPA Dynamic Web Reality) |
| **Red Team Attack Coverage** | `PARTIAL` | 7 attacks verified; 30-vector full penetration suite required. | Phase 8 (Red Team Penetration) |

---

## 6. Immutable Engineering Directives for Subsequent Phases

1. **Evidence > Implementation > Documentation > Claims**.
2. **Never claim 0.00% network leakage without capturing actual socket bytes**.
3. **Never claim real AI performance when `MockVLMClient` executed**.
4. **Never describe heuristic raster scanning as deep OCR**.
5. **No sideways feature expansion until vertical evidence criteria are satisfied**.
