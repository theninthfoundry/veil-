# VEIL — Architecture Forensic Audit & Subsystem Verification

**Audit Date**: September 2, 2026  
**Scope**: 12-Stage Privacy-Preserving Perception-Reasoning-Action Pipeline  
**Core Invariant**: *See locally. Reason remotely. Reveal nothing sensitive.*

---

## 1. The 12-Stage Architectural Pipeline

```
[STAGE 1] RAW PAGE (Live Web Document)
    │
    ▼
[STAGE 2] LOCAL PERCEPTION (DOM TreeWalker & Element Discovery)
    │
    ▼
[STAGE 3] SENSITIVE DATA DETECTION (Span-Arbitrated Regex & Attribute Scanner)
    │
    ▼
[STAGE 4] LOCAL SANITIZATION & REDACTION (Visual Blackout Layer & Value Exclusion)
    │
    ▼
[STAGE 5] PRIVACY AUDIT FIREWALL (Pre-Flight Payload & Task Scanner)
    │
    ▼
[STAGE 6] SANITIZED CONTEXT GENERATION (Structural Skeleton + data-veil-id)
    │
    ▼
═══════════════════════════════════════════════════════════════════
                   DEVICE PERIMETER BOUNDARY
═══════════════════════════════════════════════════════════════════
    │
    ▼
[STAGE 7] REMOTE REASONING GATEWAY (FastAPI / Ollama / Mock Planner)
    │
    ▼
[STAGE 8] SEMANTIC ACTION PROPOSAL (Zero-Coordinate Target + ValueRef)
    │
    ▼
═══════════════════════════════════════════════════════════════════
                   DEVICE PERIMETER BOUNDARY
═══════════════════════════════════════════════════════════════════
    │
    ▼
[STAGE 9] LOCAL TARGET RESOLUTION (Fuzzy Word Overlap & DOM Identifier Lookup)
    │
    ▼
[STAGE 10] RISK CLASSIFICATION & GATING (SAFE / SENSITIVE / HIGH_RISK / BLOCKED)
    │
    ▼
[STAGE 11] LOCAL EXECUTION & VAULT INJECTION (On-Device ValueRef Resolution)
    │
    ▼
[STAGE 12] RE-PERCEPTION & LOOP ORCHESTRATION (Finite State Machine / MAX_STEPS = 5)
```

---

## 2. Stage-by-Stage Forensic Subsystem Breakdown

| Stage | Subsystem | Implementation File | Key Function / Class | Input Data | Output Data | Caller | Sync / Async | Real Runtime Status | Test Coverage | Mock Status | Failure Mode |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | Raw Web Page | Browser Tab | Native DOM | HTML / CSS / JS | DOM Tree | Browser Engine | Sync | **VERIFIED** | Verified | Live | Document crash / unreachable |
| **2** | Local Perception | `core/dom-utils.js`, `core/detector.js` | `scanVisibleText()`, `labelFor()` | `Document` root | Text nodes, interactive tags | `content.js` | Sync | **VERIFIED** | 15 Fixtures (JSDOM) | None | Malformed DOM / disconnected nodes |
| **3** | Sensitive Data Detection | `core/detector.js` | `scanForPII()`, `scanFormFields()`, `scanText()` | DOM elements & text content | `Array<Detection>` (type, confidence, element) | `content.js`, benchmarks | Sync | **VERIFIED** | 15 Fixtures, 10 Real-Lab pages | None (Regex/Heuristic) | OCR/Canvas text missed (DOM only) |
| **3b** | Vision Fallback | `content/vision-fallback.js` | `detectFaces()`, `getDetector()` | Viewport `<img>`, `<video>`, `<canvas>` | `Array<Detection>` (face boxes) | `content.js` (conditional) | Async | **PARTIAL / UNVERIFIED** | None (Caught in try/catch) | Stubbed in offline env | Catch block swallows error; yields to DOM |
| **4** | Visual Redaction | `content/redactor.js` | `renderRedactions()` | `Array<Detection>` | DOM `#veil-redaction-layer` divs | `content.js` | Sync | **VERIFIED** | JSDOM / Browser | None | CSS transform misalignment on scroll |
| **5** | Context Sanitization | `core/context-builder.js` | `buildSanitizedContext()` | `Document`, detections | `{ elements: [...] }` (Zero values) | `content.js`, `agent-orchestrator.js` | Sync | **VERIFIED** | 14 Resolver assertions | None | Sensitive element missed if detection missed |
| **6** | Privacy Audit Firewall | `core/privacy-audit.js` | `runPrivacyAudit()` | Sanitized context, task instruction | `{ status: "PASS"\|"FAIL", leaks: [] }` | `agent-orchestrator.js`, `content.js` | Sync | **VERIFIED** | 12 Security assertions | None | Blocks outbound transmission if leak > 0 |
| **7** | Network Gateway | `background/background.js` | `callServer()` | Sanitized JSON payload | JSON response from backend | `content.js` via runtime message | Async | **VERIFIED** | End-to-end server tests | None | Network timeout / 502 Bad Gateway |
| **8** | Remote Reasoning | `server/app.py`, `server/vlm_client.py` | `POST /act`, `MockVLMClient.decide()`, `OllamaVLMClient.decide()` | `{ task, page: { elements } }` | `{ action, target, valueRef, reasoning }` | `background.js` | Async | **VERIFIED (Mock)** / **PARTIAL (Ollama)** | PyTest / TestClient | `MockVLMClient` is rule-based fallback | 422 if `value` present; 400 if prompt injection |
| **9** | Target Resolution | `core/action-resolver.js` | `resolveTarget()` | `TargetOut`, `Document` | `Element \| null` | `agent-orchestrator.js`, `content.js` | Sync | **VERIFIED** | 14 Resolver assertions | None | Returns `null` if score < 0.3 (No mis-clicks) |
| **10** | Risk Classifier | `core/risk-classifier.js` | `classifyActionRisk()` | Action, target element, sensitive set | `{ level, allowed, requiresConfirmation }` | `agent-orchestrator.js` | Sync | **VERIFIED** | 12 Security assertions | None | Blocks raw typing into sensitive fields |
| **11** | Secret Vault & Resolution | `core/secret-vault.js`, `core/action-executor.js` | `resolveSecret()`, `executeAction()` | `valueRef`, origin, fieldId | Plaintext secret injected into DOM | `agent-orchestrator.js` | Sync | **VERIFIED** | 12 Security assertions | None (In-memory vault) | Refuses if origin or fieldId mismatches |
| **12** | Autonomous Loop Orchestrator | `core/agent-orchestrator.js` | `runAutonomousLoop()` | Task string, callback pipeline | Execution result, step traces | `content.js` | Async | **VERIFIED** | 7 Attack assertions | None (State machine) | Terminates at MAX_STEPS = 5 or blocked action |

---

## 3. Subsystem Evaluation Findings

### Perception & Redaction
1. **DOM Preservation**: The system adheres strictly to the non-destructive overlay architecture. The webpage DOM is NOT destroyed or permanently replaced; blackout bars (`.veil-bar`) are positioned via `getBoundingClientRect()` inside an isolated `#veil-redaction-layer`.
2. **Context Isolation**: `context-builder.js` constructs structural JSON without a `value` field. Form fields are tagged with `sensitive: true/false`.

### Privacy Gate & Invariant P1
1. **Double Verification**: 
   - Layer 1 (Client): `privacy-audit.js` runs regex scanners over both the serialized JSON context and the task string. If any unredacted PII or `value` property is detected, status is marked `FAIL` and network dispatch is aborted.
   - Layer 2 (Server): `app.py` enforces `extra="forbid"` on `ElementIn`. Sending a `value` field triggers an immediate HTTP 422 `extra_forbidden` error.

### Action Authority & ValueRef
1. **Zero-Coordinate Architecture**: The remote model never transmits pixel coordinates (`x, y`). It transmits semantic targets (either `data-veil-id` or descriptive text).
2. **ValueRef Authorization**: For sensitive inputs (credit card, CVV, passwords), the model specifies `valueRef: "LOCAL_SECRET_01"`. The actual credential is kept entirely in-memory in `secret-vault.js` and injected directly into the DOM node at dispatch time. Raw secrets are scrubbed from telemetry and the security ledger.
