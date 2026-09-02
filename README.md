<div align="center">

# 🛡️ VEIL v1.0 — Release Candidate 1 (RC-1)
### **Privacy-First Browser Agent Security Layer**

[![ISRO SIH 2026](https://img.shields.io/badge/ISRO%20SIH-2026%20Problem%20Statement-blue.svg?style=for-the-badge)](https://www.sih.gov.in)
[![Category](https://img.shields.io/badge/Category-Cybersecurity%20%7C%20AI%20Safety-purple.svg?style=for-the-badge)](#)
[![Status](https://img.shields.io/badge/Status-Release%20Candidate%201%20(RC--1)-darkgreen.svg?style=for-the-badge)](#)
[![Security Invariant](https://img.shields.io/badge/Security%20Invariant-Model%20Has%20No%20Direct%20Authority-orange.svg?style=for-the-badge)](#)
[![Wire Leakage](https://img.shields.io/badge/Wire%20Leakage-0.00%25%20(0%20Bytes)-brightgreen.svg?style=for-the-badge)](#)
[![Local Latency](https://img.shields.io/badge/Local%20Pipeline%20Latency-4.71ms-cyan.svg?style=for-the-badge)](#)

<br/>

```
  ██    ██ ███████ ██ ██      
  ██    ██ ██      ██ ██      
  ██    ██ █████   ██ ██      
   ██  ██  ██      ██ ██      
    ████   ███████ ██ ███████ 
```

### **"SEE LOCALLY • SANITIZE LOCALLY • REASON REMOTELY • ACT LOCALLY"**

*An on-device visual perception runtime, zero-leakage privacy firewall, and local execution authority bridging AI browser agents with untrusted multimodal models.*

---

</div>

<br/>

## 🎯 The Core Thesis

> ### *"VEIL gives an AI agent the ability to operate the web without giving the AI ownership of the user's private information."*
>
> **The Deeper Principle**: *VEIL doesn't try to make the AI trustworthy. It makes trust unnecessary at the security boundary.*

---

## 🔒 The Formal Security Invariant

$$\boxed{\text{"The model can observe sanitized context and propose actions, but it can never directly access protected values or directly execute browser actions."}}$$

```
                      UNTRUSTED DOMAIN (Remote / External)
               ┌──────────────────────────────────────────────┐
               │   • Remote Multimodal Model (Ollama / VLM)  │
               │   • Untrusted Webpage HTML / Third-Party JS  │
               │   • Adversarial Injections & Mutation Traps │
               └──────────────────────┬───────────────────────┘
                                      │
                         SANITIZED    │    ADVISORY
                         OBSERVATION  │    PROPOSALS
                         (Read-Only)  │    (Unprivileged)
                                      ▼
               ════════════════════════════════════════════════
               🔒 VEIL LOCAL TRUST BOUNDARY (On-Device Runtime)
               ════════════════════════════════════════════════
                                      │
                      ┌───────────────┴───────────────┐
                      │                               │
                      ▼                               ▼
           ┌──────────────────────┐       ┌──────────────────────┐
           │ LOCAL PRIVACY ENGINE │       │ LOCAL ACTION GUARD   │
           │ • On-Device Detection│       │ • Semantic Resolver  │
           │ • Canvas Pixel OCR   │       │ • Policy Engine      │
           │ • Context Sanitizer  │       │ • Risk Classifier    │
           │ • Pre-Flight Firewall│       │ • ValueRef Vault     │
           └──────────────────────┘       └───────────┬──────────┘
                                                      │
                                            ┌─────────┴─────────┐
                                            ▼                   ▼
                                         [ SAFE ]         [ HIGH_RISK ]
                                            │                   │
                                            ▼                   ▼
                                       [ EXECUTE ]     [ WAITING_FOR_HUMAN ]
                                                                │
                                                                ▼
                                                          [ APPROVED ]
                                                                │
                                                                ▼
                                                          [ REVALIDATE ]
                                                                │
                                                                ▼
                                                           [ EXECUTE ]
```

---

## ⚡ 60-Second Visual "Aha!" Moment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. REAL WEBPAGE               │ 2. PRIVACY FIREWALL │ 3. AI CONTEXT         │
│ ───────────────────────────── │ ─────────────────── │ ───────────────────── │
│ Name:    Sreeshanth Reddy     │                     │ Name:    [REDACTED]   │
│ Email:   sreeshanth@isro.gov  │    🔒 VEIL ON-DEVICE│ Email:   [REDACTED]   │
│ Card:    4111 2222 3333 4444  │    CANARY FILTER    │ Card:    [REDACTED]   │
│ Order:   Place Order ₹4,999   │                     │ Button:  #submit-btn  │
└─────────────────────────────────────────────────────────────────────────────┘
```
**Outcome**: 0 protected values crossed the reasoning boundary. Local pipeline latency: **4.71 ms**.

---

## 🏆 Seven Release Certification Gates (C1 – C7)

| Gate ID | Certification Gate | Grounded Verification Method | Status |
|---|---|---|:---:|
| **C1** | **Privacy Boundary** | Outbound context JSON inspected across 7 PII categories (42 entity fixtures). | **CERTIFIED** |
| **C2** | **Secret Isolation (ValueRef)** | Model receives abstract tokens (`LOCAL_SECRET_PASS`); real secrets stay in local vault. | **CERTIFIED** |
| **C3** | **Action Authority** | Coordinate injections and raw script executions terminate at local validator. | **CERTIFIED** |
| **C4** | **Prompt Injection Isolation** | Webpage text treated as untrusted data; local authorization rules remain immutable. | **CERTIFIED** |
| **C5** | **TOCTOU Mutation Safety** | Modified target text or amount causes pre-execution revalidator ($< 0.25$) to abort. | **CERTIFIED** |
| **C6** | **Wire Transport Privacy Proof** | Physical socket egress inspection verifies 0 bytes of sensitive data transmitted. | **CERTIFIED** |
| **C7** | **Fail-Closed Containment** | Ollama offline, malformed JSON, or missing targets result in safe state termination. | **CERTIFIED** |

---

## ⏱️ Multi-Stage Physical Latency Decomposition

```
-----------------------------------------------------------------------------
| Pipeline Layer                | P50 (ms) | P95 (ms) | P99 (ms) | Mean (ms)  |
-----------------------------------------------------------------------------
| 1. Local Perception           |     2.80 |     4.10 |     5.70 |       2.84 |
| 2. Privacy & Context Sanitize |     1.00 |     1.40 |     2.00 |       1.00 |
| 3. Target Resolution & Policy |     0.80 |     1.20 |     1.60 |       0.87 |
| LOCAL SECURITY PIPELINE       |     4.60 |     6.70 |     9.30 |       4.71 |
-----------------------------------------------------------------------------
| 4. Network Wire Transport     |    24.00 |    41.00 |    57.00 |      25.00 | (Localhost HTTP Socket)
| 5. Ollama VLM (qwen2-vl:7b)   |  1700.00 |  3100.00 |  3800.00 |    1850.00 | (GPU Tensor Forward Pass)
| TOTAL AGENT TASK LOOP         |  1728.60 |  3147.70 |  3866.30 |    1879.71 | (Complete Full Turnaround)
-----------------------------------------------------------------------------
```

---

## 🚀 Quick Start (Under 2 Minutes)

1. Open **Google Chrome** $\rightarrow$ Navigate to `chrome://extensions/`.
2. Enable **Developer mode** $\rightarrow$ Click **Load unpacked** $\rightarrow$ Select `d:\veil\veil-extension`.
3. Open the Command Center in Chrome:
   ```
   d:\veil\veil-extension\command-center\command-center.html
   ```

### Run Verification Suite:
```bash
# 1. Run Architecture & Installation Self-Test
node veil-extension/scripts/verify-installation.js

# 2. Run 7-Scene SIH Demo Story
node veil-extension/benchmark/run-sih-7scenes.js

# 3. Run Seven-Pillar (C1 - C7) Certification Suite & Profiler
node veil-extension/benchmark/run-formal-certification.js
```

---

## 📚 Complete Documentation Index

- **[Installation Guide (INSTALL.md)](file:///d:/veil/INSTALL.md)**: Setup on a clean machine.
- **[Demonstration Script (DEMO.md)](file:///d:/veil/DEMO.md)**: 60-second and 5-minute winning presentation walkthrough.
- **[Frozen Architecture (ARCHITECTURE.md)](file:///d:/veil/ARCHITECTURE.md)**: Complete system design blueprint.
- **[Formal Threat Model (THREAT_MODEL.md)](file:///d:/veil/THREAT_MODEL.md)**: Threat boundaries and attack mitigations.
- **[Benchmark Telemetry (BENCHMARKS.md)](file:///d:/veil/BENCHMARKS.md)**: P50/P95/P99 latency and accuracy tables.
- **[Security Policy (SECURITY.md)](file:///d:/veil/SECURITY.md)**: Security invariants and vulnerability handling.
- **[Release Truth Matrix (docs/RELEASE_TRUTH_MATRIX.md)](file:///d:/veil/docs/RELEASE_TRUTH_MATRIX.md)**: Component-by-component audit matrix.
- **[Evidence Dossier (docs/CERTIFICATION_EVIDENCE_DOSSIER.md)](file:///d:/veil/docs/CERTIFICATION_EVIDENCE_DOSSIER.md)**: Grounded test proofs.
