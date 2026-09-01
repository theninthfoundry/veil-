# VEIL — privacy-preserving browser agent

Phase 1 build: local DOM/regex PII detection + on-page redaction. No server/VLM
round-trip yet — that's phase 2, described in the PRD alongside this project.

## What's actually implemented right now

- `core/detector.js` — DOM-attribute, DOM-heuristic, and regex-based PII
  detection (password, email, phone, credit card, address, name, and two
  India-specific formats: Aadhaar-shaped and PAN-shaped numbers). Card numbers
  are Luhn-validated, not just pattern-matched. Overlapping matches (an
  Aadhaar-shaped number is also phone-shaped; a 16-digit card's first 12
  digits are also Aadhaar-shaped) are arbitrated by specificity so one real
  item isn't counted as two different types.
- `content/redactor.js` — draws opaque bars over detected fields in the live
  page, positioned from the real layout so structure and buttons stay visible
  and only values are covered. Hover a bar to see the original value locally
  (never sent anywhere) — a debug affordance, not a network feature.
- `content/content.js`, `background/background.js`, `popup/` — wiring: scans
  on load and on DOM mutation, reports counts + local latency to a popup
  dashboard, and a working on/off toggle.
- `benchmark/` — a Node harness (via jsdom) that runs the detector against 8
  labeled fixture pages and reports per-type precision/recall.

## What's explicitly not built yet (see the PRD for the plan)

- Local vision fallback (faces, PII baked into images/canvas/video) — the
  detector has a `scanForFaces()` stub that returns nothing, on purpose.
- The server/VLM leg and the action resolver/executor.
- The full side-by-side "what leaves the device" comparison view.
- A policy editor UI (one policy is hardcoded: redact everything detected).

## Load it in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `veil-extension` folder.
4. Open `test-pages/mock-checkout.html` in a tab (drag the file into Chrome,
   or `open test-pages/mock-checkout.html` from a terminal).
5. Click the VEIL icon in the toolbar — the popup should show redacted field
   counts and a detect+redact latency in milliseconds. The page itself should
   show dark bars over the name, email, card, CVV, address, and notes fields.

## Run the benchmark

```
npm install
npm run benchmark
```

This prints a per-fixture breakdown and per-type precision/recall, computed
by counting detections against `benchmark/ground-truth.json`.

**Read the numbers honestly.** These are 8 fixtures I hand-built specifically
to validate the detector's behavior — including two overlap cases I found
and fixed while building this (see `core/detector.js` comments). A clean
100%/100% here means the detector does what it was designed to do on cases
I anticipated; it is not evidence of real-world coverage. Before relying on
these numbers for the actual ISRO evaluation, add fixtures pulled from real,
messy pages you didn't write yourself — that's the test that actually counts.

## Known limitations worth knowing about before the demo

- Free-text name detection is intentionally not implemented (plain-text name
  scanning has a very high false-positive rate — almost any capitalized two-
  word phrase looks like a name). Names are only caught via DOM attributes
  (`autocomplete="name"`) or field-name heuristics.
- The phone regex requires a separator (space/dash/dot) or a `+country`
  prefix. A bare 10-digit run with no formatting won't be flagged — this is
  a deliberate precision/recall trade-off, documented in
  `core/detector.js`.
- Redaction bars are viewport-positioned; extremely fast-scrolling pages
  between a scroll event and the reposition timer firing may show a bar
  briefly out of place. Not a correctness issue, a cosmetic one.
