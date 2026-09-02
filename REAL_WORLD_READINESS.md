# VEIL — Real-World Readiness & Evaluation Assessment

**Audit Date**: September 2, 2026  
**Auditor**: Forensic Engineering Assessment System  

---

## 1. Controlled Testbed vs. Real-World Web Evaluation

| Dimension | Controlled Testbed (Current Repo) | Real-World Web Environment | Readiness Gap & Forensic Assessment |
|---|---|---|---|
| **DOM Architecture** | Static HTML fixtures (`benchmark/fixtures/` and `test-pages/case-001` to `case-010`). | Dynamic Single-Page Applications (React, Vue, Angular, Next.js, Svelte). | **MODERATE GAP**: VEIL uses `MutationObserver` on `document.documentElement` with 500ms debounce. Tested on synthetic DOM mutations; untested on heavy Virtual DOM reconciliations. |
| **Shadow DOM & Web Components** | Flat standard DOM trees without Shadow Roots. | Modern design systems (Salesforce Lightning, Polymer, Lit, Shoelace) heavily using `#shadow-root (open/closed)`. | **CRITICAL GAP**: Standard `document.querySelectorAll()` in `core/context-builder.js` and `core/detector.js` cannot pierce Shadow DOM boundaries without recursive shadow tree walking. |
| **Cross-Origin iframes** | Single top-level frame. | Embedded payment gateways (Stripe, Razorpay, PayPal, Netbanking iframes). | **CRITICAL GAP**: Browser security prevents content scripts in the parent frame from accessing cross-origin iframe DOMs unless extension permissions inject scripts into `all_frames: true`. |
| **Visual / Raster Content** | Standard HTML `<input>` and `<label>` tags. | HTML5 Canvas charts, scanned invoice PNGs, PDF viewers, CAPTCHA images. | **CRITICAL GAP**: `vision-fallback.js` handles face bounding boxes in `<img>`/`<canvas>`, but VEIL lacks an on-device OCR engine (Tesseract/PaddleOCR) to read text rendered inside pixels. |
| **VLM Integration** | `MockVLMClient` (Deterministic rule-based keyword matcher). | Live multimodal models via Ollama (`qwen2-vl`, `llama3.2-vision`) or hosted endpoints. | **MODERATE GAP**: `OllamaVLMClient` is implemented in `server/vlm_client.py`, but default demo runs against `MockVLMClient`. |

---

## 2. Live Lab & Evaluation Modes

The repository provides two distinct evaluation interfaces:

### A. The Browser Interactive Lab (`veil-extension/lab/lab.html`)
- **Mode 1 (OBSERVE)**: Visualizes detected PII fields and sanitized skeletons for cases #001 to #010.
- **Mode 2 (SIMULATE)**: Displays AI intent proposals and risk tiers without executing browser clicks.
- **Mode 3 (LIVE AGENT)**: Demonstrates the perception -> reasoning -> local vault injection loop.
- **Forensic Status**: **SIMULATED UI**. Uses `CASE_DATABASE` in `lab.js` with `setTimeout()` timers to show how the pipeline operates rather than executing live on an arbitrary active tab.

### B. The Automated Real-Lab Test Runner (`real-lab/run-all.js`)
- **Runner Suite**: Executes `runner/observe.js`, `runner/simulate.js`, and `runner/live-agent.js` using Node.js and JSDOM across all 10 real-world benchmark cases.
- **Forensic Status**: **GENUINE HEADLESS EXECUTION**. Evaluates DOM perception, sanitization, risk classification, and ValueRef injection on the 10 taxonomy HTML pages in ~820ms.

---

## 3. Real-World Readiness Scorecard

```
[====================>                    ] 52% Overall Real-World Readiness

- Chrome Extension & Manifest V3:          95% (Fully operational)
- DOM Form & Privacy Sanitization:         90% (Highly robust on standard HTML)
- Action Risk & ValueRef Injection:        85% (Solid local security boundary)
- Autonomous Loop & Step Budgeting:        85% (FSM state machine works)
- Shadow DOM & iframe Traversal:           20% (Requires recursive walker & all_frames)
- Local OCR & Raster Perception:           15% (Face detection stubbed; OCR missing)
- Live Open-Weight VLM Reasoning:          50% (Ollama client built; mock is default)
```
