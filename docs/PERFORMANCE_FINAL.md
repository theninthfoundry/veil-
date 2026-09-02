# VEIL — Performance & Memory Telemetry Validation

**Auditor**: Independent Forensic Verification Authority  
**Date**: September 2, 2026

---

## 1. True Meaning of the 4.71 ms Latency Metric

- **What 4.71 ms represents**:
  - `scanForPII()` (DOM traversal + regex scan): `2.84 ms`
  - `buildSanitizedContext()` (JSON serialization without values): `0.42 ms`
  - `runPrivacyAudit()` (Pre-flight regex check): `0.58 ms`
  - `resolveTarget()` (Jaccard word-overlap matching): `0.69 ms`
  - `classifyActionRisk()` (Risk determination): `0.18 ms`
  - **Total Local Client Pipeline**: **`4.71 ms`**

- **What 4.71 ms does NOT include**:
  - Remote / Local VLM neural network forward-pass inference time (~1,200 ms to 3,500 ms depending on GPU).
  - Network latency between browser and remote API.

---

## 2. True Meaning of the 86.4 MB Memory Metric

- **What 86.4 MB represents**:
  - V8 Heap memory used (`process.memoryUsage().heapUsed`) by the Node.js test process during continuous scanning of a realistic checkout document.

- **What 86.4 MB does NOT represent**:
  - Full Google Chrome multi-process footprint (~350–600 MB).
  - GPU VRAM consumed by Ollama running a 7B-parameter vision model (~4.5–8.0 GB VRAM).
