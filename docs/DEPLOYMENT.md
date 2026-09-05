# VEIL — Clean-Machine Deployment & Production Setup Guide

## 1. Prerequisites

Before installing VEIL, ensure your host environment meets the following specifications:

| Component | Minimum Version | Verification Command | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | v18.0.0+ | `node --version` | Required for benchmark runners, JSDOM test suite, and extension development. |
| **Python** | 3.10.0+ | `python --version` | Required for the FastAPI reasoning gateway. |
| **Google Chrome** | v116.0+ | Chrome `About` page | Manifest V3 compliance with Side Panel and WebAssembly SIMD support. |
| **Ollama** *(Optional / Recommended)* | v0.3.0+ | `ollama --version` | Required for `VEIL_EVIDENCE_MODE=true` real multimodal reasoning (`qwen2-vl:7b`). |

---

## 2. Quick-Start Commands (One-Command Setup)

### Using PowerShell:
```powershell
# 1. Run Pre-Flight Diagnostics
.\scripts\doctor.ps1

# 2. Run Comprehensive Suite Verification
.\scripts\verify.ps1

# 3. Run Benchmark Suite
.\scripts\benchmark.ps1

# 4. Run Formal Invariant Certification
.\scripts\certify.ps1
```

### Using Windows Batch:
```cmd
scripts\doctor.bat
scripts\verify.bat
scripts\benchmark.bat
scripts\certify.bat
```

---

## 3. Manual Step-by-Step Installation

### Step A: Install Extension & Benchmark Dependencies
```bash
cd veil-extension
npm install
```

### Step B: Setup Python Reasoning Gateway
```bash
cd veil-extension/server
pip install -r requirements.txt
```

### Step C: Start the Local Reasoning Gateway
```bash
# In one terminal:
cd veil-extension/server
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

### Step D: Load VEIL in Google Chrome
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** in the upper-right corner.
3. Click **Load unpacked**.
4. Select the directory: `d:\veil\veil-extension`.
5. The **VEIL — Privacy Firewall** icon will appear in the toolbar. Click it to open the Privacy Observatory.

---

## 4. Configuring Evidence Mode with Local Ollama

In standard development mode, VEIL falls back to a deterministic rule-based reasoner if Ollama is offline.
To enforce strict zero-fallback real multimodal reasoning:

1. Start Ollama and pull the vision model:
   ```bash
   ollama pull qwen2-vl:7b
   ollama serve
   ```
2. Enable evidence mode in the gateway environment:
   ```bash
   export VEIL_EVIDENCE_MODE=true
   export VEIL_OLLAMA_URL=http://127.0.0.1:11434
   export VEIL_OLLAMA_MODEL=qwen2-vl:7b
   ```
3. Verify gateway status:
   ```bash
   curl http://127.0.0.1:8000/health
   ```
   Output confirms:
   ```json
   {
     "ok": true,
     "evidenceMode": true,
     "ollama": { "available": true, "model": "qwen2-vl:7b" },
     "reasoner": { "type": "REAL_OLLAMA" }
   }
   ```
