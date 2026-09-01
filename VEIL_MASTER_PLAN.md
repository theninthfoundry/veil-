# VEIL — Master Architecture Specification & Implementation Plan
**ISRO SIH 2026: On-device Visual Perception for Light-weight Browser Agents**  
*Core Paradigm:* **SEE LOCALLY → SANITIZE LOCALLY → REASON REMOTELY → ACT LOCALLY**

---

## 1. Executive Summary & Core Mission

### 1.1 What Exactly is VEIL?
**VEIL** is an on-device privacy firewall, perception runtime, and action guardrail situated between an AI browser agent and the user's browser. 

In standard browser agent architectures, an AI model receives raw screen captures containing confidential information (credit card numbers, CVVs, passwords, full names, addresses, emails, phone numbers, and visible facial imagery). 

**VEIL fundamentally changes this pipeline:**
1. **Perceives Locally:** Extracts page structure, interactive elements, and metadata using a **DOM-First, Vision-Second** approach.
2. **Detects & Classifies PII Locally:** Identifies sensitive fields through an efficient 4-tier detection hierarchy without sending raw data over the network.
3. **Redacts On-Device:** Visually blacks out or masks sensitive values on screen and scrubs them from the DOM tree while preserving structural geometry and semantic roles.
4. **Audits Sanitization:** Runs a strict secondary verification pass. If any unredacted sensitive token or bounding box remains visible, transmission is immediately halted (**0.00% Leakage Guarantee**).
5. **Reasons Remotely over Sanitized Context:** Sends *only* sanitized representations (masked screenshots, stripped DOM skeleton, user goal) to a remote Vision-Language Model (VLM).
6. **Executes via Semantic Action Guards:** Resolves high-level intent returned by the VLM (e.g., `CLICK "Place Order"`) to verified DOM nodes, confirms security thresholds, and executes safely on-device.

```
                          USER'S BROWSER
                                │
                                ▼
                   ┌──────────────────────────┐
                   │    VEIL LOCAL LAYER      │
                   └────────────┬─────────────┘
                                │
                 ┌──────────────┼──────────────┐
                 ▼              ▼              ▼
                DOM          VISION         CONTEXT
             Perception    Perception        Fusion
                 │              │
                 └──────┬───────┘
                        ▼
                SENSITIVE DATA DETECTION (4-Tier)
                        │
                        ▼
                LOCAL REDACTION (Blackout/Mask/Blur)
                        │
                        ▼
                PRIVACY AUDITOR
                        │
               ┌────────┴────────┐
               │                 │
             BLOCK              SAFE
                                 │
                                 ▼
                         SANITIZED DATA
                                 │
                            (HTTPS / WS)
                                 │
                                 ▼
                         REMOTE VLM / SERVER
                                 │
                                 ▼
                          ACTION PROPOSAL
                                 │
                                 ▼
                        LOCAL ACTION GUARD
                                 │
                                 ▼
                          SAFE EXECUTION
```

---

## 2. ISRO SIH Scoring Rubric & Target Metrics

| Criterion | Weight | Target Metric | Engineering Implementation |
|---|---|---|---|
| **Accuracy of Visual Context** | 25% | > 98% | High-fidelity bounding box extraction + semantic DOM tree fusion |
| **PII Detection Recall & Precision** | 20% | Recall > 97.5%<br>Precision > 95% | 4-Tier detection hierarchy (DOM attributes + regex + semantic heuristics) |
| **Redaction Precision & Leakage** | 20% | **0.00% Leakage** | Structural blackout/masking + secondary Privacy Auditor verification |
| **Client-Side Resource Usage** | 20% | **RAM < 280MB**<br>**CPU < 18%** | DOM-first lightweight processing; lazy on-demand WebGPU/WASM vision fallback |
| **End-to-End Latency** | 15% | **< 300 ms** total | Local pipeline < 45ms; local/streamed VLM inference roundtrip |

---

## 3. Core Architectural Subsystems

### 3.1 Subsystem 1: Perception Engine (DOM-First, Vision-Second)
* **DOM Scanner (Primary, 0ms overhead):** Scans inputs, buttons, links, selects, and text nodes. Extracts `id`, `name`, `autocomplete`, `type`, `aria-label`, placeholder, and computed viewport bounding boxes (`getBoundingClientRect`).
* **Vision Fallback (Secondary, On-Demand):** Only loaded if raster elements (`<canvas>`, `<video>`, `<img>`) exist in the viewport. Uses `Transformers.js` / `ONNX Runtime Web` with WebGPU acceleration (with automatic WASM fallback).

### 3.2 Subsystem 2: 4-Tier PII Detection Engine
* **Tier 1 — Explicit DOM Semantics:** `type="password"`, `autocomplete="cc-number"`, `autocomplete="cc-csc"`, `autocomplete="email"`.
* **Tier 2 — Attribute Heuristics:** `name`, `id`, `placeholder`, `aria-label` matching credit cards, phone numbers, SSN, PAN, Aadhaar, CVVs.
* **Tier 3 — High-Speed Regex Scanning:** Scans visible text nodes for payment patterns, phone formats, emails, and address tokens.
* **Tier 4 — Vision Fallback Detector:** Detects faces or raster credentials inside images/videos.

### 3.3 Subsystem 3: Redaction Engine & Privacy Auditor
* **Redaction Strategy:**
  * **Financial / Passwords / CVV:** Complete opaque rectangular blackout (`#000000`).
  * **Email / Phone / Names:** Character masking (`████████`) preserving length and field boundaries.
  * **Faces / Raster:** Gaussian blur filter over bounding boxes.
* **Privacy Auditor:** Verifies that no sensitive DOM tokens remain in the exported skeleton and no sensitive pixel areas remain unmasked before dispatching the payload.

### 3.4 Subsystem 4: Remote Reasoning Gateway (FastAPI + VLM)
* Accepts sanitized JSON payload containing the task, sanitized image (base64), and interactive element map.
* Generates **Semantic Action Proposals** (e.g. `{"type": "CLICK", "target": {"role": "button", "name": "Place Order"}}`), avoiding brittle pixel coordinates.
* Provider-agnostic adapter supporting local Ollama (`Qwen2-VL-7B`, `MiniCPM-V`, `LLaVA`) or hosted endpoints.

### 3.5 Subsystem 5: Local Action Guard & Resolver
* **Semantic Resolver:** Maps target descriptions from the VLM back to real live DOM nodes using accessibility tree matching and fuzzy label scoring.
* **Safety & Permission Gate:** Evaluates risk level (e.g., navigation vs. financial purchase). Blocks unauthorized or dangerous actions and requests explicit user confirmation for high-stakes actions.

### 3.6 Subsystem 6: Privacy Observatory Dashboard
* Live instrumentation displaying:
  * **Protection Status:** Real-time counter of detected vs redacted vs leaked items.
  * **Telemetry Latency Waterfall:** Capture (ms), Perception (ms), Redaction (ms), Audit (ms), Network (ms), VLM (ms), Action (ms).
  * **Resource Monitor:** Client memory usage, CPU/GPU utilization.
  * **Side-by-Side View:** Raw Screen vs Sanitized Server View.

---

## 4. Repository & File Structure

```
veil/
├── apps/
│   ├── extension/                        # Chrome Extension (Manifest V3 + TypeScript + Vite)
│   │   ├── src/
│   │   │   ├── background/
│   │   │   │   ├── index.ts              # Service worker entry & lifecycle
│   │   │   │   ├── capture.ts            # chrome.tabs.captureVisibleTab management
│   │   │   │   └── messaging.ts          # Cross-context message dispatcher
│   │   │   │
│   │   │   ├── content/
│   │   │   │   ├── index.ts              # Content script entry point
│   │   │   │   ├── dom-scanner.ts        # Fast DOM & accessibility tree scanner
│   │   │   │   ├── element-map.ts        # Element registry & bounding box mapper
│   │   │   │   ├── action-resolver.ts    # Semantic target -> DOM element resolver
│   │   │   │   └── observer.ts           # MutationObserver for dynamic page changes
│   │   │   │
│   │   │   ├── privacy/
│   │   │   │   ├── pii-detector.ts       # 4-tier detection coordinator
│   │   │   │   ├── pii-classifier.ts     # Classification tags & confidence scoring
│   │   │   │   ├── policy-engine.ts      # Redaction policies (blackout vs mask vs blur)
│   │   │   │   ├── redactor.ts           # Offscreen canvas pixel & DOM text redactor
│   │   │   │   └── privacy-auditor.ts    # Pre-transmission leak verification guard
│   │   │   │
│   │   │   ├── vision/
│   │   │   │   ├── model-loader.ts       # ONNX Runtime Web / Transformers.js loader
│   │   │   │   ├── webgpu.ts             # WebGPU hardware acceleration & WASM fallback
│   │   │   │   ├── face-detector.ts      # Lightweight on-device face detector
│   │   │   │   └── inference.ts          # Fallback inference pipeline
│   │   │   │
│   │   │   ├── pipeline/
│   │   │   │   ├── perception.ts         # Unified DOM + Vision coordinator
│   │   │   │   ├── sanitization.ts       # End-to-end sanitization controller
│   │   │   │   ├── transmission.ts       # Secure API client to FastAPI server
│   │   │   │   └── execution.ts          # Action Guard & local dispatch engine
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   ├── App.tsx               # Observatory main application
│   │   │   │   ├── Observatory.tsx       # Live metric waterfall & telemetry panel
│   │   │   │   ├── ComparisonView.tsx    # Raw vs Sanitized side-by-side inspector
│   │   │   │   ├── Metrics.tsx           # PII counters & resource gauges
│   │   │   │   └── index.html            # Popup / Side-panel HTML host
│   │   │   │
│   │   │   ├── types/
│   │   │   │   ├── perception.ts         # ScreenContext & ScreenElement definitions
│   │   │   │   ├── privacy.ts            # SensitiveRegion & Redaction types
│   │   │   │   └── actions.ts            # AgentAction & TargetDescription types
│   │   │   │
│   │   │   └── utils/
│   │   │       ├── geometry.ts           # Bounding box math & scale conversions
│   │   │       └── timing.ts             # High-resolution performance timer
│   │   │
│   │   ├── manifest.json                 # Manifest V3 configuration
│   │   ├── vite.config.ts                # Vite multi-bundle build configuration
│   │   └── package.json
│   │
│   └── server/                           # Reasoning Gateway Backend (FastAPI + Python)
│       ├── app/
│       │   ├── main.py                   # FastAPI application initialization & CORS
│       │   ├── routes/
│       │   │   ├── agent.py              # POST /api/agent/step (Task + Sanitized IR -> Action)
│       │   │   ├── perception.py         # Debug perception inspection endpoints
│       │   │   └── health.py             # Health check & model status
│       │   │
│       │   ├── agent/
│       │   │   ├── planner.py            # Step planner & action generator
│       │   │   ├── prompts.py            # Strict JSON schema system prompts for VLM
│       │   │   └── schemas.py            # Pydantic models for incoming & outgoing payloads
│       │   │
│       │   ├── models/
│       │   │   ├── vlm.py                # Abstract Base Class for VLM providers
│       │   │   ├── ollama_provider.py    # Local Ollama client (Qwen2-VL / LLaVA)
│       │   │   └── cloud_provider.py     # Hosted endpoint adapter fallback
│       │   │
│       │   └── security/
│       │       └── validation.py         # Strict schema & sanitization sanity check
│       │
│       ├── tests/
│       │   └── test_planner.py
│       └── requirements.txt
│
├── packages/
│   ├── protocol/                         # Shared JSON Schemas & TypeScript interfaces
│   │   ├── action-schema.json
│   │   ├── context-schema.json
│   │   └── index.ts
│   │
│   └── mock-site/                        # Standalone Testbed for Checkout & Auth Flows
│       ├── index.html                    # Realistic checkout form with payment & PII
│       ├── success.html                  # Target confirmation screen
│       └── server.js                     # Local static server for mock testing
│
├── benchmark/                            # Evaluation Suite against ISRO Rubric
│   ├── pages/                            # 10-15 Ground-truth HTML test cases
│   ├── annotations/                      # Ground-truth JSON annotations (boxes + labels)
│   ├── ground-truth/                     # Standardized evaluation datasets
│   └── evaluate.py                       # Precision / Recall / F1 / Leakage computation
│
├── docs/
│   ├── architecture.md                   # Full system architecture documentation
│   ├── privacy-model.md                  # PII classification & threat analysis
│   ├── threat-model.md                   # Adversarial attack & leak prevention model
│   └── evaluation.md                     # Benchmark methodology & results
│
├── scripts/
│   ├── setup.ps1                         # One-click Windows development setup
│   └── run-benchmark.ps1                 # Automated evaluation runner
│
├── README.md                             # Project overview & quickstart guide
└── package.json                          # Monorepo root workspace configuration
```

---

## 5. Formal Data Contracts & Communication Protocols

### 5.1 Screen Context Data Structure (`packages/protocol/context.ts`)
```typescript
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenElement {
  id: string;
  type: "button" | "input" | "link" | "text" | "image" | "select" | "checkbox";
  tag: string;
  role?: string;
  label?: string;
  name?: string;
  placeholder?: string;
  autocomplete?: string;
  bbox: BoundingBox;
  sensitive: boolean;
  disabled?: boolean;
}

export interface SensitiveRegion {
  id: string;
  type: "password" | "financial" | "email" | "phone" | "name" | "address" | "face";
  source: "dom" | "regex" | "vision";
  confidence: number;
  bbox: BoundingBox;
  redaction: "blackout" | "mask" | "blur";
}

export interface ScreenContext {
  viewport: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  screenshot: {
    sanitizedBase64: string;
    width: number;
    height: number;
  };
  elements: ScreenElement[];
  sensitiveRegions: SensitiveRegion[];
  privacyAudit: {
    status: "PASS" | "FAIL";
    detectedCount: number;
    redactedCount: number;
    leakedCount: number;
  };
  timestamp: number;
}
```

### 5.2 Action Protocol (`packages/protocol/action.ts`)
```typescript
export interface TargetDescription {
  role?: string;
  name?: string;
  text?: string;
  selector?: string;
  tag?: string;
  elementId?: string;
}

export type AgentAction =
  | { type: "CLICK"; target: TargetDescription }
  | { type: "TYPE"; target: TargetDescription; value: string }
  | { type: "SELECT"; target: TargetDescription; option: string }
  | { type: "SCROLL"; direction: "up" | "down"; amount: number }
  | { type: "WAIT"; milliseconds: number }
  | { type: "FINISH"; message: string };

export interface AgentStepRequest {
  taskId: string;
  taskPrompt: string;
  sanitizedScreenshot: string; // Base64 encoded masked image
  domSkeleton: ScreenElement[];
  redactedCategories: string[];
}

export interface AgentStepResponse {
  action: AgentAction;
  reasoning: string;
  confidence: number;
}
```

---

## 6. Detailed Step-by-Step Implementation Roadmap

```
PHASE 1: Core Perception & Redaction Engine (Days 1–3)
  ├── 1.1 Mock Checkout testbed (realistic PII & payment inputs)
  ├── 1.2 Extension skeleton (Manifest V3, Vite, TypeScript)
  ├── 1.3 Fast DOM Scanner with bounding box extraction
  ├── 1.4 3-Tier DOM/Regex PII detection engine
  ├── 1.5 Canvas-based Visual Redactor (Blackout & Masking)
  └── 1.6 Pre-transmission Privacy Auditor & Verification Guard

PHASE 2: Server Gateway & Local Action Loop (Days 4–7)
  ├── 2.1 FastAPI server & Pydantic validation schemas
  ├── 2.2 Local VLM adapter (Ollama: Qwen2-VL / MiniCPM-V)
  ├── 2.3 Semantic Action schema & structured prompt templates
  ├── 2.4 Content script Semantic Target Resolver
  └── 2.5 Local Action Guard with safety checks and user confirmation

PHASE 3: Vision Fallback & Hardware Acceleration (Days 8–10)
  ├── 3.1 Lazy-load trigger (only on <canvas>, <video>, <img>)
  ├── 3.2 Transformers.js / ONNX Runtime Web integration
  ├── 3.3 WebGPU execution provider with WASM fallback
  └── 3.4 Face & raster credential detection + Gaussian blur

PHASE 4: Privacy Observatory & Telemetry Dashboard (Days 11–13)
  ├── 4.1 Side Panel / Popup UI with modern minimal aesthetic
  ├── 4.2 Live stage-by-stage latency waterfall graph
  ├── 4.3 PII detection & redaction counters (0% leakage indicator)
  └── 4.4 Raw vs Sanitized split-screen live comparison view

PHASE 5: Benchmark Suite & SIH Demonstration Lock (Days 14–16)
  ├── 5.1 10-15 Labeled ground-truth test pages
  ├── 5.2 Automated Python evaluation harness (`evaluate.py`)
  ├── 5.3 Stress testing (responsive resizing, zoom, dynamic DOM)
  └── 5.4 5-Minute competition-winning demo rehearsal & metric capture
```

---

## 7. The 5-Minute SIH Demo Script

1. **0:00 - 0:30 (The Problem):** Open standard browser agent comparison. Highlight that current computer-use agents send raw user screens containing unmasked credentials and passwords to remote servers.
2. **0:30 - 1:00 (The Task):** Open the realistic mock checkout page. Launch VEIL Observatory with zeroed telemetry. Submit task: *"Complete this checkout."*
3. **1:00 - 2:00 (The Hero Moment — Raw vs Sanitized):** Show VEIL local scan. Highlight detected sensitive regions (Password, Card, CVV, Email, Address, Face). Show split screen: User's real screen on left, **Sanitized Server View on right with 0 leaked secrets**.
4. **2:00 - 3:00 (Reasoning & Safe Action Execution):** Show the sanitized packet reaching the VLM. The VLM reasons over the structure and returns `CLICK "Place Order"`. The Local Action Guard validates the node locally and executes the click.
5. **3:00 - 4:00 (Observatory Telemetry):** Highlight the real-time latency waterfall (Total ~250ms), memory (<280MB), and 0% sensitive data transmission.
6. **4:00 - 5:00 (Benchmark & Conclusion):** Present the automated benchmark results against the 5 ISRO rubric criteria. Conclude: *"VEIL doesn't ask the server to protect private data—it ensures the server never receives it in the first place."*
