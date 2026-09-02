# VEIL v1.0 — Architecture Specification (Frozen Baseline)

**Release Baseline**: VEIL v1.0 (Frozen Architecture)  
**Classification**: Privacy-First Browser Agent Security Architecture  

---

## 1. Frozen End-to-End Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                       REAL WEBPAGE                          │
│                (DOM + Shadow DOM + Canvases)                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 LOCAL PERCEPTION ENGINE                     │
│  ├── DOM TreeWalker & ARIA Accessibility Tree               │
│  ├── Open Shadow Roots & Multi-Frame Traversal              │
│  └── On-Device 2D Canvas Pixel OCR Provider                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   LOCAL PRIVACY LAYER                       │
│  ├── Span-Arbitrated Regex PII Detector                     │
│  ├── In-Page Redaction (.veil-bar Overlays)                 │
│  └── Context Builder (Stripping .value properties)          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     PRIVACY FIREWALL                        │
│  ├── Pre-Flight Outbound Canary Interceptor                 │
│  └── Server Schema Firewall (extra="forbid" -> HTTP 422)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                        SANITIZED DATA
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 UNTRUSTED AI REASONER                       │
│  ├── Multimodal Reasoner (Ollama: qwen2-vl:7b)              │
│  └── Operation: Observe Skeleton ➔ Propose Actions          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                        ACTION PROPOSAL
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    LOCAL AUTHORITY                          │
│  ├── Semantic Target Resolver (Jaccard Overlap >= 0.25)     │
│  ├── User Policy Engine (Configurable Rules)                │
│  ├── Action Risk Classifier (SAFE vs HIGH_RISK)             │
│  └── Local In-Memory ValueRef Credential Vault              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                   ┌───────────┴───────────┐
                   ▼                       ▼
              [ SAFE ]               [ HIGH_RISK ]
                   │                       │
                   ▼                       ▼
              [ EXECUTE ]          [ HUMAN APPROVAL ]
                                           │
                                           ▼
                                     [ REVALIDATE ]
                                           │
                                           ▼
                                      [ EXECUTE ]
                                           │
                                           └─────► [ RE-PERCEIVE ]
```

---

## 2. Core Architectural Subsystems

### 1. Local Perception Engine (`core/dom-utils.js`, `core/visual-ocr.js`)
- Traverses interactive elements via `TreeWalker`.
- Recursively parses open Shadow DOM roots and cross-origin iframe boundaries.
- Inspects HTML5 `<canvas>` raster pixel buffers via local Pixel OCR without DOM metadata.

### 2. Local Privacy Engine (`core/detector.js`, `content/redactor.js`, `core/secret-vault.js`)
- Detects PII spans across Email, Phone, Aadhaar, PAN, Credit Card, Password, and Address.
- Injects `.veil-bar` overlays natively into the page DOM.
- Replaces raw credentials with abstract tokens (`valueRef: "LOCAL_SECRET_PASS"`).

### 3. Untrusted Remote Reasoner (`server/vlm_client.py`)
- Multimodal model (Ollama `qwen2-vl:7b`) receives only sanitized structural skeletons.
- Operates under strict fail-closed evidence mode (HTTP 503 if offline).

### 4. Local Action Authority (`core/action-resolver.js`, `core/policy-engine.js`, `core/mutation-guard.js`)
- Resolves abstract proposals to live DOM nodes.
- High-risk operations pause the agent loop in `WAITING_FOR_HUMAN`.
- Pre-execution validator recalculates target fingerprints to abort TOCTOU mutation traps.
