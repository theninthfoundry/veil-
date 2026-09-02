# VEIL — privacy-preserving browser agent

**Working name.** ISRO SIH problem statement: *On-device Visual Perception for Light-weight Browser Agents* (Software category, Smart Automation theme). Rename freely — nothing below depends on the name.

---

## 1. The one-liner

A browser extension that understands what's on your screen locally, strips out anything sensitive before any network call, and lets a cloud VLM reason over only the sanitized structure — then executes its instructions back on-device.

**"See locally. Reason remotely. Reveal nothing sensitive."**

---

## 2. What ISRO actually asked for (and how it's scored)

| Criterion | Weight |
|---|---|
| Accuracy of visual context from screen | 25% |
| PII detection recall/precision | 20% |
| Redaction precision | 20% |
| Client-side resource utilization | 20% |
| End-to-end latency | 15% |

Every scoping decision below is made to protect these five numbers, in this order — not to maximize feature count.

---

## 3. Reality check, before scoping anything

This is genuinely a strong problem statement, but two things need saying plainly:

1. **Most PII does not need a vision model.** A password field, a card-number input, an email field — these are already labeled by the DOM (`type="password"`, `autocomplete="cc-number"`, `type="email"`). A regex + DOM scanner catches these with near-zero latency and near-100% precision. The problem statement itself says "DOM tags **or any other method**" — that's a hint, not filler text.
2. **The local vision model earns its place only where the DOM can't help**: canvas-rendered UI, video frames, a photo of an ID card someone has open, screenshots inside a PDF viewer. That's the real research surface, and it's narrower than "run a ViT on the whole screen."

Building all six subsystems (DOM scanner, vision fallback, policy engine, server VLM, dashboard, action guard) to equal depth in hackathon time means everything works at 60%. One vertical demo, done at 100%, scores better on every line of that rubric above — and that's the actual strategy, not a compromise.

---

## 4. MVP definition

**In scope for v1:**
- One demo flow, fully working: a mock checkout page (name, email, card, CVV, address, "place order" button).
- DOM-based PII detector (regex + input-type + autocomplete attributes) — this is the primary detector, not a fallback.
- One local vision fallback: face detection on any `<video>`/`<canvas>`/`<img>` element in view (using a small pretrained model, not built from scratch).
- Redaction: bounding-box blackout for text fields, blur for faces. Structure (labels, layout, button positions) preserved; values are not.
- Server: one open-weight VLM call that receives the sanitized screenshot + DOM skeleton + task instruction, returns a single next action.
- Action executor: resolves the returned action to a real DOM element and performs it (click/type/scroll).
- Privacy Observatory dashboard: live counters for PII types blocked, latency breakdown, resource usage. This is your demo's centerpiece — build it early, not last.
- A small benchmark harness that computes precision/recall/leakage against a labeled test set of 10-15 pages, because the rubric literally asks for these numbers.

**Explicitly out of scope for v1** (real, useful ideas — just not this build):
- Aadhaar/PAN-specific detectors, semantic "this is a medical record" classification, QR/barcode detection, signature detection.
- Policy editor UI (P0-P4 sensitivity levels) — hardcode one policy, mention the extensible version in the pitch.
- Multi-site generalization — one clean demo site beats five broken ones.
- Firefox support — build for Chrome only, mention Firefox as "same WebExtensions APIs, follow-on work."

---

## 5. Architecture

```
BROWSER EXTENSION (Manifest V3)
  content script: DOM scanner + screenshot capture
        │
        ▼
  DOM/regex PII detector ──────┐
  (primary — fast, high precision)
        │                      │
  local vision fallback ───────┤   (faces / raster PII only)
  (Transformers.js + ONNX Runtime Web, WebGPU)
        │                      │
        ▼                      ▼
     REDACTION ENGINE (bounding-box blackout / blur)
        │
   sanitized screenshot + DOM skeleton + task
        │
        ▼
  SERVER (FastAPI + open-weight VLM)
        │
   next action: { intent, target_description }
   (a description like "button labeled Place order" —
    NOT raw x/y pixels, which break on reflow/zoom/DPI)
        │
        ▼
  ACTION RESOLVER (content script)
   resolves target_description → real DOM node → click/type
        │
        ▼
  PRIVACY OBSERVATORY DASHBOARD
   (extension popup or side panel — live metrics)
```

Key correction versus the "vision-first" pitch you were evaluating: the server should return a **semantic target description**, not pixel coordinates. Coordinates break the moment the page reflows, the user zooms, or the demo runs on a different display. Resolving to a DOM node client-side is both safer (the action guard can actually reason about *what* it's clicking, not just *where*) and more robust for a live demo.

---

## 6. UI/UX direction

Modern and minimal, matching the mockup above: flat surfaces, one accent color, no gradients or shadows, generous whitespace, sentence-case labels, restrained typography (two weights max). Three screens, in build priority order:

1. **Privacy Observatory** (built first — it's the demo). Live counters: fields redacted, PII types blocked list, latency breakdown (capture / detect / redact / network / VLM / action), resource usage (CPU/memory). This is what an evaluator watches while the agent works.
2. **Extension popup**: on/off toggle, current site's detected sensitivity level, a one-line "what's being sent" summary.
3. **Side-by-side comparison view** (the killer demo moment): user's real browser next to the sanitized version the server actually received. This is the single image that makes the whole pitch legible in five seconds — invest disproportionate polish here.

Skip a settings/policy editor for v1 — one hardcoded policy, mentioned as "configurable in the full version" during the pitch.

---

## 7. Tech stack

- **Extension**: TypeScript, Manifest V3, Vite. Content script does DOM scanning + screenshot capture (`chrome.tabs.captureVisibleTab`).
- **Local vision**: Transformers.js (wraps ONNX Runtime Web) running a small pretrained face-detection model via WebGPU, with WASM fallback for browsers/machines without WebGPU support.
- **Server**: FastAPI + an open-weight VLM (Qwen2-VL-7B, LLaVA-1.6, or MiniCPM-V). Given you already have an RTX 4060 set up with Ollama for SatQuery AI, that's your fastest path to a working dev server — no cloud cost until you need finale-day throughput, at which point a hosted endpoint (Together.ai, Groq, or a rented GPU-hour) is a drop-in swap.
- **Dashboard**: plain React + CSS variables, or the extension's side panel API directly. Keep it framework-light — this is a popup, not an app.

---

## 8. Success metrics (what you actually measure and show)

| Metric | Target for demo | How you get the number |
|---|---|---|
| PII recall | >95% on your labeled test set | Benchmark harness, 10-15 pages |
| PII precision | >90% | Same harness |
| Redaction leakage | 0% sensitive pixels transmitted | Same harness — this is your strongest claim if it holds |
| Client memory | <300 MB | Chrome task manager during demo |
| End-to-end latency | <300 ms capture-to-action | Instrumented timestamps at each pipeline stage |

Build the harness in week one, not the week before the demo — it's also what tells you whether the DOM-first approach is actually holding up, before you've sunk time into the vision fallback.

---

## 9. Build roadmap

**Phase 1 — foundation**
Extension shell, DOM/regex PII scanner, redaction rendering (blackout boxes only, no vision yet), benchmark harness running against the DOM detector alone. Prove the cheap path works before adding the expensive one.

**Phase 2 — server loop**
FastAPI server, VLM integration (local via Ollama first), semantic action-target format, action resolver on the client. Get one full round-trip working end to end on the mock checkout page — this is your first real demo, even if it's ugly.

**Phase 3 — vision fallback + dashboard**
Add the local face-detection fallback for raster content. Build the Privacy Observatory dashboard against real pipeline timestamps (not mocked numbers). This phase is where "modern minimal" polish actually goes.

**Phase 4 — hardening for the demo**
Lock the demo script to one flawless flow. Re-run the benchmark harness, capture the final numbers for the pitch deck. Rehearse the side-by-side comparison screen specifically — it's doing the most persuasive work in the room.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| WebGPU support is inconsistent across machines | WASM fallback path from day one, not bolted on later |
| VLM returns an action that doesn't map to a real element | Resolver falls back to "action unclear, skipping" rather than guessing — a visible skip beats a wrong click in a live demo |
| Server latency dominates the 300ms budget | Local Ollama dev inference is usually faster than a cold cloud endpoint — benchmark both before finale day, keep whichever wins |
| Face-detection model adds meaningful latency for a demo path where it rarely triggers | Only invoke the vision fallback when the DOM scanner finds `<video>`/`<canvas>`/`<img>` elements in the viewport — skip it entirely otherwise |

---

## 11. The demo script (five minutes, in order)

1. Open the mock checkout page live.
2. Show the Privacy Observatory dashboard already running, counters at zero.
3. Type a task instruction: "complete this purchase."
4. Show the side-by-side view: real page left, sanitized version right, PII counters ticking up as fields are scanned.
5. Show the server's returned action and the client executing it.
6. End on the benchmark numbers slide: recall, precision, leakage, latency, memory — the five rubric lines, answered.

That last slide is doing as much work as the live demo. Build the harness early enough that those numbers are real, not estimated.
