# VEIL v1.0 — Installation & Clean-Machine Setup Guide

**Product Title**: VEIL v1.0 — Privacy-First Browser Agent Security Layer  
**Target Platform**: Google Chrome (Manifest v3) / Chromium-based browsers  
**Backend Runtime**: Python 3.10+ / Node.js v20.x+  
**Local Reasoner**: Ollama (`qwen2-vl:7b` / `llama3.2-vision`)

---

## 1. Quick 3-Step Setup (Under 2 Minutes)

### Step 1: Load the Chrome Extension
1. Open Google Chrome and navigate to: `chrome://extensions/`.
2. Enable **Developer mode** via the toggle in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the directory:
   ```
   d:\veil\veil-extension
   ```
5. You will see **VEIL — privacy firewall for browser agents (v1.0.0)** active in your extensions toolbar.

---

### Step 2: Start the Local Reasoning Gateway (Optional for Live VLM)
If you wish to test live neural reasoning with Ollama:
1. Ensure Ollama is running:
   ```bash
   ollama run qwen2-vl:7b
   ```
2. Start the FastAPI gateway:
   ```bash
   cd d:\veil\veil-extension\server
   python -m uvicorn app:app --port 8000
   ```

*Note: If Ollama is not running, VEIL operates in strict evidence fail-closed mode or interactive simulation mode in the Command Center.*

---

### Step 3: Open the VEIL Command Center
Open the following file in your browser:
```
d:\veil\veil-extension\command-center\command-center.html
```
*(Or right-click the file and select "Open with Google Chrome".)*

You are now ready to operate the live Command Center, run workflows against local test apps, inspect the visual privacy firewall, and execute the 7-scene SIH demonstration!

---

## 2. Automated Self-Test Verification

To run the full suite of on-device verification tests from your terminal:

```bash
# 1. Verify Extension Integrity & Core Architecture
node veil-extension/scripts/verify-installation.js

# 2. Run the 7-Scene SIH Demo Story
node veil-extension/benchmark/run-sih-7scenes.js

# 3. Run the Seven-Pillar (C1 - C7) Certification Suite & Profiler
node veil-extension/benchmark/run-formal-certification.js
```

---

## 3. Directory Structure Overview

```
d:\veil\
├── veil-extension/
│   ├── manifest.json                  # Manifest v3 definition
│   ├── command-center/                # Unified Product Cockpit (HTML/CSS/JS)
│   ├── core/                          # Authoritative Local Perception & Privacy Engine
│   │   ├── session.js                 # Unified Session Manager
│   │   ├── policy-engine.js           # User Security Policy Engine
│   │   ├── workflow-runner.js         # 5 Canonical Golden Workflows
│   │   ├── detector.js                # Span-Arbitrated PII Detector
│   │   ├── visual-ocr.js              # On-Device Canvas Pixel OCR Provider
│   │   ├── secret-vault.js            # In-Memory ValueRef Vault
│   │   ├── mutation-guard.js          # TOCTOU Pre-Execution Revalidator
│   │   └── network-forensics.js       # Pre-Flight Privacy Firewall
│   ├── test-apps/                     # Standalone Local Test Universe (8 Apps)
│   ├── benchmark/                     # Automated Verification Suites & Results
│   └── server/                        # FastAPI Gateway for Ollama VLM
├── docs/                              # Comprehensive Architectural & Proof Dossiers
├── INSTALL.md                         # Installation Guide (this document)
├── DEMO.md                            # 5-Minute Evaluator Presentation Guide
├── ARCHITECTURE.md                    # Frozen Architecture Specification
├── THREAT_MODEL.md                    # Formal Security Threat Model
├── BENCHMARKS.md                      # Latency & Empirical Benchmark Telemetry
└── README.md                          # Master Project Overview
```
