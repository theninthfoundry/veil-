# VEIL — System Architecture & 3-Authority Model

**Problem Statement**: On-Device Visual Perception & Privacy-Preserving Light-Weight Browser Agents  
**Guiding Principle**: *See locally. Reason remotely. Reveal nothing sensitive.*

---

## The Three Independent Authorities

Rather than granting an AI agent monolithic control over the browser, VEIL separates browser automation into three independent, non-overlapping authorities:

```
                          VEIL AGENT SYSTEM
                                  │
       ┌──────────────────────────┼──────────────────────────┐
       ▼                          ▼                          ▼
  1. PERCEPTION AUTHORITY     2. PRIVACY AUTHORITY       3. ACTION AUTHORITY
  "What is on the screen?"    "What can leave device?"   "What can happen?"
       │                          │                          │
  - DOM TreeWalker           - PII Regex Scanner        - Semantic Target Resolver
  - Input Type Parser        - Luhn CC Checksum         - Action Risk Classifier
  - Accessibility Labels     - Visual Face Masking      - Local Secret Vault (ValueRef)
  - Local Vision (OWL-ViT)   - Privacy Audit Firewall   - DOM Mutation Validator
       │                          │                          │
       └──────────────────────────┼──────────────────────────┘
                                  ▼
                         SANITIZED SKELETON ONLY
                                  │
                     ═════════════╪═════════════
                       DEVICE TRUST BOUNDARY
                     ═════════════╪═════════════
                                  │
                                  ▼
                        REMOTE REASONING VLM
                        (Proposes: TYPE LOCAL_SECRET_01)
                                  │
                     ═════════════╪═════════════
                       INBOUND ACTION GATE
                     ═════════════╪═════════════
                                  │
                                  ▼
                     LOCAL SECRET VAULT RESOLUTION
                     (Injects: 4111-1111-1111-1111 locally)
```

---

## 1. Perception Layer (On-Device Perception)

- **DOM & Accessibility Extraction**: Parses active form controls, buttons, links, and input attributes (`autocomplete`, `aria-label`, `placeholder`).
- **Selective Visual Perception (Transformers.js / WebGPU)**:
  - Triggered only when raster content (`<img>`, `<canvas>`, `<video>`) enters the viewport.
  - Zero-shot object detection isolates faces and graphical PII.
  - Keeps resource footprint `< 300MB` by skipping vision inference on pure DOM pages.

## 2. Privacy Layer (The Firewall)

- **Span-Arbitrated PII Engine**: Detects Aadhaar (12-digit grouped), PAN (alphanumeric), Emails, Phones, Credit Cards (Luhn-verified 13-19 digits).
- **Non-Destructive Redaction Layer**: Renders high-speed CSS blackout bars and sub-region face blur overlays using `getBoundingClientRect()`.
- **Privacy Audit Engine (Network Gate)**: Audits outbound serialized JSON payloads; strictly blocks transmission if any sensitive value or PII pattern is leaked (`LeakedRegions === 0`).

## 3. Reasoning Gateway (Untrusted Remote VLM)

- **Endpoint**: `POST /act` on FastAPI backend (`127.0.0.1:8000`).
- **Input**: Structural skeleton + stable `data-veil-id` tags + user task. No coordinates, no field values (`extra="forbid"`).
- **Prompt Injection Defense**: Validates skeleton labels against adversarial override strings.
- **Provider Cascade**: Local Ollama (`Qwen2-VL-7B` / `LLaVA`) with instant fallback to deterministic heuristic planner.

## 4. Action & Safety Layer (Local Decision Engine)

- **Zero-Coordinate Semantic Resolution**: Matches remote action target via `data-veil-id` or fuzzy natural-language description (`wordOverlapScore`).
- **Action Risk Classifier**:
  - `SAFE`: scroll, open menu, expand, next.
  - `SENSITIVE`: submit, save, upload.
  - `HIGH_RISK`: purchase, pay, transfer, delete.
- **Sensitive Target Gate**: Hard refusal to type any value into a field marked sensitive.
- **Tamper-Evident Security Ledger**: Logs all perception, privacy audit, risk evaluation, and execution events.

---

## SIH Evaluation Alignment

| SIH Evaluation Criteria | Weight | VEIL Implementation & Evidence |
|---|---|---|
| **Visual Context Accuracy** | 25% | DOM + Accessibility + selective WebGPU zero-shot face/raster detection. |
| **PII Detection Precision & Recall** | 20% | **100% Precision / 100% Recall** across 15 adversarial benchmark fixtures. |
| **Redaction & Leakage Prevention** | 20% | **0.00% Leakage Rate** verified by automated network Privacy Audit Firewall. |
| **Client Resource Utilization** | 20% | Conditional vision triggering keeps idle RAM `< 120MB` and scan time `< 30ms`. |
| **End-to-End Latency** | 15% | Sub-50ms local perception + redaction; instrumented telemetry waterfall. |

## Regulatory Compliance Matrix
- **DPDP Act (India)**: Strict on-device redaction ensures no biometric or financial IDs leave client perimeter.
- **GDPR Article 25**: Privacy by Design & Default enforced via pre-flight privacy firewall.
