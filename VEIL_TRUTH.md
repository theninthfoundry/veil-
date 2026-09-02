# VEIL TRUTH — The 5-Minute Executive Summary

**Forensic Engineering Audit Summary**  
**Date**: September 2, 2026  
**Auditor**: Forensic Assessment Engine  

---

## 1. What Actually Works (Verified)
- **Zero Raw PII Egress (Invariant P1)**: Form field values and raw credentials NEVER leave the browser. `context-builder.js` omits `.value`, `privacy-audit.js` scans outbound JSON with regex, and `server/app.py` enforces `extra="forbid"` (returns HTTP 422 if a value is passed).
- **Non-Destructive Redaction Layer**: Visual blackout overlays (`#veil-redaction-layer`) are rendered over sensitive bounding boxes without destroying native DOM inputs.
- **Local Secret Vault (ValueRef)**: The cloud AI proposes symbolic references (`valueRef: "LOCAL_SECRET_01"`); real credit cards and passwords are kept in-memory and injected directly into the DOM at dispatch time.
- **Zero-Coordinate Action Resolver**: The model never returns fragile `(x, y)` pixels; it returns semantic targets matched via `data-veil-id` or fuzzy Jaccard word-overlap (threshold 0.3).
- **Action Risk Classifier**: 4-tier gating (SAFE, SENSITIVE, HIGH_RISK, BLOCKED) hard-blocks raw typing into sensitive fields.
- **Autonomous Multi-Step Orchestrator**: Finite state machine with a hard step budget (`MAX_STEPS = 5`) and mandatory re-perception.
- **15-Fixture PII Precision Benchmark**: Real JSDOM scan correctly identifies 42/42 PII items across 15 HTML benchmark files.

---

## 2. What Doesn't Work / Is Missing
- **No Local OCR for Canvas/Images**: Cannot read or mask text rendered inside HTML5 `<canvas>`, scanned receipt images, or PDFs.
- **No Free-Text NLP for Names/Addresses**: Names and addresses are only detected if input attributes (`autocomplete="name"`, `name="address"`) exist.
- **No Shadow DOM / iframe Piercing**: Standard `querySelectorAll` cannot traverse `#shadow-root` or cross-origin payment iframes.
- **No Interactive HIGH_RISK Modal**: Actions flagged `HIGH_RISK` are logged, but no in-page modal pauses execution for user confirmation.

---

## 3. What is Fake / Synthetic / Hardcoded
- **Ablation Study RAM & Latency (`run-ablation-study.js`)**: `'84 MB'`, `'1,420 MB'`, and `185.0 ms` are hardcoded strings/floats passed as arguments to `evaluateConfig()`.
- **Proof Scorecard Animation (`proof.js`)**: The "Run All Integrity Tests" button runs `setTimeout()` animations displaying canned PASS badges without executing real test assertions.
- **Interactive Live Lab UI (`lab.js`)**: Uses a static `CASE_DATABASE` with `setTimeout()` timers rather than running live against the active tab.

---

## 4. What is Unproven
- **Local WebGPU / Transformers.js Vision**: `vision-fallback.js` references OWL-ViT over Hugging Face; it has not executed successfully in offline/headless environments.
- **Live Memory Profiling**: Memory consumption is architecturally low (<35KB core code), but has not been instrumented dynamically via browser heap APIs.
- **Live Multimodal Ollama In-Loop**: `OllamaVLMClient` is coded in Python, but all current test runs and default demos execute against `MockVLMClient`.

---

## 5. Top 3 Blockers for SIH Finale
1. **Default Vault Wildcard**: `DEFAULT_VAULT` includes `'*'` in `allowedOrigins`, which weakens domain isolation during security scrutiny.
2. **Synthetic Ablation Data**: Evaluators inspecting `run-ablation-study.js` will find hardcoded memory strings and stubbed Config C vision functions.
3. **Static Live Lab**: The Live Lab UI looks fully functional but runs on canned `setTimeout` data instead of the active tab.

---

## 6. Exact Next Steps (Immediate Action Plan)
1. **Harden Vault**: Remove `'*'` from `allowedOrigins` in `core/secret-vault.js` and enforce strict domain whitelisting.
2. **Clean Benchmark**: Update `benchmark/run-ablation-study.js` to measure actual `process.memoryUsage()` and real execution times.
3. **Live Wire Lab UI**: Connect `lab.js` to `chrome.tabs.sendMessage` so clicking "Execute Pipeline" executes live on the active page.
4. **Bundle Local WASM OCR**: Integrate lightweight Tesseract.js WASM for offline raster/canvas PII redaction.
5. **Verify Live Ollama**: Run and record live inference with `qwen2-vl:7b` on local GPU (`localhost:11434`).

---

## 7. Forensic Scorecard

```
  ┌──────────────────────────────────────────────────────────────┐
  │  Current Forensic Score:             77 / 100               │
  │  Honest MVP Baseline:                82 / 100               │
  │  Potential after 8-Step Roadmap:     96 / 100 (SIH Winner)   │
  └──────────────────────────────────────────────────────────────┘
```
