# VEIL — privacy-preserving browser agent

Phase 1 + 2 + 3(partial) build: local DOM/regex PII detection, on-page
redaction, a working server round trip, and a local vision fallback for
faces. The vision piece is real code against a confirmed-real package and
model, but it is the one part of this project genuinely untested in this
build environment — read that section before you rely on it for a demo.

## What's actually implemented right now

**Phase 1 — local detection**
- `core/detector.js` — DOM-attribute, DOM-heuristic, and regex-based PII
  detection (password, email, phone, credit card, address, name, and two
  India-specific formats: Aadhaar-shaped and PAN-shaped numbers). Card numbers
  are Luhn-validated, not just pattern-matched. Overlapping matches (an
  Aadhaar-shaped number is also phone-shaped; a 16-digit card's first 12
  digits are also Aadhaar-shaped) are arbitrated by specificity so one real
  item isn't counted as two different types.
- `content/redactor.js` — draws opaque bars over detected fields in the live
  page from the real layout, so structure and buttons stay visible and only
  values are covered. Hover a bar to see the original value locally (never
  sent anywhere) — a debug affordance, not a network feature. Handles both
  whole-element detections (a form field) and sub-region detections (one
  face inside a larger image).

**Phase 2 — server round trip**
- `core/context-builder.js` — builds the *only* thing allowed to leave the
  device for a task: element tag, role, and label. No field's value is ever
  included, sensitive or not.
- `server/app.py` + `server/vlm_client.py` — FastAPI server with one
  endpoint, `POST /act`. Two backends: `MockVLMClient` (rule-based, no model
  needed, used by default) and `OllamaVLMClient` (calls a local Ollama
  install). The server schema rejects any request that includes a field
  `value` at all — tested, see below.
- `core/action-resolver.js` — resolves the server's returned target (an id
  referencing the sanitized context, or a natural-language description as
  fallback) to a real DOM element. No pixel coordinates anywhere in this
  pipeline.
- `core/action-executor.js` — executes click/type/scroll. Refuses to type
  into any element the local detector flagged as sensitive, even if the
  server's response asks it to — a second boundary, not just a convention.
- `popup/` — a task input box wired to the full round trip: build context →
  call server → resolve → execute → show what happened and how long it took.
- `comparison/` — the side-by-side "what leaves the device" view: your
  browser's real field values on the left, only labels (with a redaction
  bar over sensitive values) on the right, opened from a button in the
  popup. Reads real values locally via `core/comparison-builder.js` — that
  data never leaves the extension's own messaging; the server only ever
  sees what `context-builder.js` produces.

**Phase 3 — vision fallback (faces), genuinely unverified**
- `content/vision-fallback.js` — detects faces in `<img>`/`<video>`/`<canvas>`
  elements using `@huggingface/transformers` v4.2.0's zero-shot object
  detection pipeline with `Xenova/owlvit-base-patch32` and the label
  "human face". This exact model+label pair is Hugging Face's own
  documented example, confirmed by installing the real package in this
  build environment and reading its shipped type definitions — not
  recalled from memory. `vendor/transformers.web.min.js` is the real
  browser bundle from that install (Manifest V3 forbids loading extension
  code from a remote CDN, so it has to ship inside the package).
  **Read "known limitations" below before you rely on this for a demo** —
  this build environment has no browser, no WebGPU, and no route to the
  model/wasm CDNs this needs at runtime, so none of this has actually run
  anywhere yet. It's wired to fail safe: wrapped in try/catch in
  `content.js`, so if it breaks, DOM detection and redaction — the parts
  that do have passing tests — are unaffected.

## What's explicitly not built yet

- A policy editor UI (one policy is hardcoded: redact everything detected).
- Firefox support (Chrome only for now).

## Load it in Chrome

1. Start the server (see below) — the popup's task box needs it.
2. Open `chrome://extensions`, turn on **Developer mode**, click
   **Load unpacked**, select this `veil-extension` folder.
3. Open `test-pages/mock-checkout.html` in a tab.
4. Click the VEIL icon — the popup shows redacted field counts and
   detect+redact latency. The page shows dark bars over the sensitive
   fields.
5. Type a task in the popup, e.g. `complete this purchase`, click **Run**.
   With the mock backend this should click "Place order" and report the
   action and total time.

## Run the server

```
cd server
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8000
```

Defaults to the mock backend. To try a local Ollama model instead:

```
VEIL_VLM_BACKEND=ollama VEIL_OLLAMA_MODEL=llama3.2 uvicorn app:app --host 127.0.0.1 --port 8000
```

**The Ollama backend is written but not verified in this build environment**
— this sandbox has no Ollama install and no GPU-backed model to test against.
The mock backend *is* verified: every scenario below was run against a live
`uvicorn` instance while building this, not just written and assumed to work.

```
curl -X POST http://127.0.0.1:8000/act -H "Content-Type: application/json" -d '{
  "task": "complete this purchase",
  "page": {"elements": [
    {"id": "el-0", "tag": "button", "type": "submit", "label": "Place order", "sensitive": false}
  ]}
}'
```

Confirmed scenarios: a realistic checkout payload correctly targets "Place
order"; a task with no matching control returns `action: none` honestly
instead of guessing; a payload that smuggles a field `value` is rejected
with HTTP 422; a malformed request returns 422, not a 500.

## Run the tests

```
npm install
npm run benchmark              # detector precision/recall against 8 fixtures
node benchmark/run-resolver-test.js   # context builder + resolver + executor + comparison data, 14 checks
```

**Read the benchmark numbers honestly.** These fixtures were hand-built to
validate specific behaviors, including two overlap bugs found and fixed while
building this (see `core/detector.js` comments). A clean 100%/100% means the
detector does what it was designed to do on cases I anticipated — it is not
evidence of real-world coverage. Add fixtures from real, messy pages you
didn't write yourself before trusting this number for the actual evaluation.

## Known limitations worth knowing about before the demo

- Free-text name detection is intentionally not implemented (plain-text name
  scanning has a very high false-positive rate). Names are only caught via
  DOM attributes or field-name heuristics.
- The phone regex requires a separator or a `+country` prefix; a bare
  unformatted 10-digit run won't be flagged — a deliberate precision/recall
  trade-off, documented in `core/detector.js`.
- The action resolver's fallback matching is word-overlap (Jaccard), not
  semantic — a description like "submit the order" won't match a button
  labeled "Place order" (no shared words) even though a person would read
  them as the same thing. It works when the server describes what it
  actually sees, which is the common case, but it isn't a language model.
- Redaction bars are viewport-positioned; extremely fast-scrolling pages
  between a scroll event and the reposition timer firing may show a bar
  briefly out of place. Not a correctness issue, a cosmetic one.
- The popup UI and the comparison page (`popup/`, `comparison/`) are
  reviewed and syntax-checked but not click-tested in an actual loaded
  Chrome extension by me — this sandbox can run Node and a real HTTP
  server, but not a real Chrome instance. The detection, resolution,
  execution, and server logic all have real automated tests above; the
  UI wiring is the one layer that genuinely needs you to load it and click
  around before you trust it for a demo.
- The vision fallback (`content/vision-fallback.js`) is unverified end to
  end — see the phase 3 section above. Specific things that could be wrong
  and I can't check from here: whether `device: 'auto'` actually resolves
  to WebGPU on your machine, whether the model's real-world face-detection
  accuracy at `threshold: 0.3` is usable (OWL-ViT is a general zero-shot
  detector, not a tuned face model — expect it to be slower and less
  precise than a purpose-built one), and whether the `host_permissions`
  entries for `huggingface.co` and `cdn.jsdelivr.net` are sufficient or
  whether the actual CDN subdomains involved (Hugging Face uses several for
  large file storage) need to be added too. Load the extension, open a page
  with a photo on it, and watch the browser console for `[VEIL]` warnings
  before you trust this for a demo.
