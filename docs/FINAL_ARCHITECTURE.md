# VEIL — Final Production Architecture Specification

**Architecture Status**: Target Production Blueprint  
**Standard**: Modular Security Kernel for AI Browser Agents  
**Date**: September 2, 2026  

---

## 1. System Topology

```
                   ┌───────────────────────────────────────┐
                   │            BROWSER / WEBPAGE          │
                   │    DOM • ARIA • PIXELS • FRAMES       │
                   └──────────────────┬────────────────────┘
                                      │
                                      ▼
                   ┌───────────────────────────────────────┐
                   │         VEIL PERCEPTION CORE          │
                   │   • TreeWalker & Shadow DOM           │
                   │   • Visible-Tab Capture               │
                   │   • On-Device WASM/TrOCR              │
                   │   • Sensor Fusion (DOM + Vision)      │
                   └──────────────────┬────────────────────┘
                                      │
                                      ▼
                   ┌───────────────────────────────────────┐
                   │         PRIVACY & DLP ENGINE          │
                   │   • Span-Arbitrated Regex & Luhn      │
                   │   • P0-P8 Sensitivity Classifier      │
                   │   • In-Memory Redaction Layer         │
                   │   • Context Minimization Engine       │
                   └──────────────────┬────────────────────┘
                                      │
                           SANITIZED CONTEXT (Zero Values)
                                      │
                                      ▼
                   ┌───────────────────────────────────────┐
                   │           REASONING PLANE             │
                   │       (Remote / Untrusted VLM)        │
                   │        Ollama (qwen2-vl:7b)           │
                   └──────────────────┬────────────────────┘
                                      │
                               ACTION PROPOSAL
                                      │
                                      ▼
                   ┌───────────────────────────────────────┐
                   │       AUTHORITY & POLICY KERNEL       │
                   │   • Model Output Firewall             │
                   │   • Policy Decision Point (PDP)       │
                   │   • Single-Use Capability Tokens      │
                   │   • Extension-Owned Approval Gate     │
                   │   • TOCTOU Target Attestation         │
                   └──────────────────┬────────────────────┘
                                      │
                               APPROVED ACTION
                                      │
                                      ▼
                   ┌───────────────────────────────────────┐
                   │           LOCAL EXECUTOR              │
                   │   • Single-Use Secret Resolution      │
                   │   • Synthetic DOM Event Dispatch      │
                   │   • Tamper-Evident Hash Chain Ledger  │
                   └───────────────────────────────────────┘
```

---

## 2. Directory Layout & Module Responsibilities

```
veil-extension/
├── core/
│   ├── kernel/                         # Trusted Security Kernel
│   │   ├── runtime.js                  # Canonical VEILRuntime state machine
│   │   ├── authority.js                # Security domain boundary enforcement
│   │   ├── capability.js               # Ephemeral, single-use Capability tokens
│   │   ├── policy.js                   # Unified Policy Decision Point (PDP)
│   │   ├── session.js                  # Durable session state (chrome.storage.session)
│   │   └── ledger.js                   # Cryptographically chained audit ledger
│   │
│   ├── perception/                     # Perception Subsystem
│   │   ├── scene-graph.js              # Unified Scene Graph representation
│   │   ├── dom.js                      # TreeWalker & Shadow DOM traversal
│   │   ├── visual-ocr.js               # On-device WASM / Transformers OCR
│   │   └── fusion.js                   # Sensor Fusion & Disagreement Gate
│   │
│   ├── privacy/                        # Privacy & Data Loss Prevention
│   │   ├── classifier.js               # P0-P8 Data Classification Engine
│   │   ├── detector.js                 # Span-arbitrated regex & Luhn check
│   │   ├── redactor.js                 # In-memory blackout overlay controller
│   │   └── minimizer.js                # Task-driven context minimization
│   │
│   ├── action/                         # Action Validation & Dispatch
│   │   ├── protocol.js                 # Strict typed action envelopes
│   │   ├── resolver.js                 # Semantic target matching (Jaccard)
│   │   ├── fingerprint.js              # Multi-attribute target fingerprinting
│   │   ├── guard.js                    # Pre-execution TOCTOU mutation revalidator
│   │   └── executor.js                 # Controlled DOM event dispatcher
│   │
│   └── transport/                      # Network Boundary
│       ├── gateway.js                  # VEILTransport.send() - Single choke point
│       └── authentication.js           # Session token handshake & verification
│
├── background/                         # Service worker (transport & lifecycle)
├── content/                            # Content script (perception & execution)
├── sidepanel/                          # Extension-owned human approval UI
├── command-center/                     # Observability & Mission Control HUD
└── benchmark/                          # Grounded certification & evaluation suites
```

---

## 3. Seven Pillars of Zero-Trust Browser Security

1. **Pillar 1: Structural Sanitization**: Outbound payloads are generated from scratch without `.value` properties; raw form contents never cross the process boundary.
2. **Pillar 2: Capability-Based Secrets**: The model requests abstract capabilities, never raw credentials. Secrets are resolved into memory only at the moment of local execution.
3. **Pillar 3: Externalized Human Governance**: Authorization for high-risk actions occurs exclusively on extension-owned surfaces (Side Panel), completely isolated from webpage scripts.
4. **Pillar 4: TOCTOU Target Attestation**: Every target is fingerprinted and revalidated immediately before click dispatch, stopping dynamic price swaps and mutation traps.
5. **Pillar 5: Sensor Fusion Consistency**: Visual OCR and DOM text must agree on button amounts and labels before state-changing execution is permitted.
6. **Pillar 6: Model Output Firewall**: Model output is treated as untrusted input. Coordinates, XPath, script URIs, and unknown action types are rejected outright.
7. **Pillar 7: Choke-Point Transport**: Every outbound byte passes through `VEILTransport.send()`, pre-flight DLP audit, and cryptographic canary checks. Direct `fetch()` is banned across the agent runtime.
