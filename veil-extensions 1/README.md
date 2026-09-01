# VEIL extensions — Lane A + Lane B features from the PRD Addendum

Built standalone against the interfaces described in the real project's
README/manifest, because the real `core/detector.js`, `content/redactor.js`,
`content/content.js`, `background/background.js`, and `popup/` files were not
available in this session. Nothing here modifies code I haven't seen — every
module is self-contained, tested independently, and includes an explicit
"INTEGRATION POINT" comment showing the one or two lines it expects to be
wired into in the real files.

**All 26 JS tests pass (`node __tests__/run-all.js`). All 4 Python guard
tests pass. All 5 new fixture HTML files parse cleanly.** This is real,
executed, verified code — not sketched pseudocode.

## What's here, by PRD Addendum feature number

| # | Feature | File(s) | Status |
|---|---|---|---|
| 1 | Fail-closed kill switch | `core/kill-switch.js` | Built + tested (6/6 tests pass) |
| 2 | Format-preserving placeholder redaction | `core/placeholder-redactor.js` | Built + tested (6/6 tests pass) — found and fixed a real bug (see below) |
| 3 | Prompt-injection defense (client) | `core/skeleton-sanitizer.js` | Built + tested (4/4 tests pass) |
| 3 | Prompt-injection defense (server) | `server/prompt_injection_guard.py` | Built + tested (4/4 tests pass, standalone Python run) |
| 4 | Local action-graph cache | `core/action-cache.js` | Built + tested (7/7 tests pass) |
| 5 | DPDP Act compliance mapping | `docs/DPDP_MAPPING.md` | Written (documentation, no code) |
| 7 | Explainable redaction (rule tagging) | `core/rule-tags.js` | Built + tested (3/3 tests pass) |
| 8 | Adversarial fixture set | `benchmark/fixtures/09-*.html` .. `13-*.html`, `benchmark/ground-truth-additions.json`, `benchmark/merge-adversarial-fixtures.js` | Built + fixtures validated + merge script smoke-tested against a synthetic project |
| 6 | Clipboard exfiltration guard | — | Correctly out of scope (Lane C) — not built, per the addendum's own reasoning |

## A bug this process actually found

While testing `checkPlaceholderLeakage()` (used to verify the email
placeholder mode never leaks the real domain-adjacent text), the first
implementation flagged a false leak: comparing `"xxxx.xxxxx@gmail.com"`
against the real address `"priya.sharma@gmail.com"` incorrectly reported
leakage, because the shared substring `"@gmail.com"` (with the `@`) wasn't
being matched against the allowed domain string `"gmail.com"` (without the
`@`). Fixed by comparing against `"@" + domain` instead of bare `domain`.
This is exactly the kind of edge case the "build it, don't just describe
it" approach is supposed to catch — it would not have been caught by
reading the code, only by running it. See the git-style before/after in
`core/placeholder-redactor.js`'s `checkPlaceholderLeakage` function if
you want the specific diff.

## How to run everything yourself

```bash
cd veil-extensions
node __tests__/run-all.js                        # 26 JS tests
python3 -c "..."                                   # see below for the Python check
```

Python guard check (no pytest dependency assumed — run directly):

```bash
python3 - <<'EOF'
import sys; sys.path.insert(0, "server")
from prompt_injection_guard import validate_task_source, build_user_content, SYSTEM_PROMPT
ok = validate_task_source({"domSkeleton": {"tag":"div","children":[]}, "taskInstruction": "buy it"})
assert ok.ok
print("prompt_injection_guard.py: OK")
EOF
```

## Exact integration steps into your real project

None of this touches your real files automatically — you control exactly
where each piece lands. In the order I'd do it:

1. **Kill switch (Feature 1).** Copy `core/kill-switch.js` into your real
   `core/`. In `background/background.js`, find the `fetch(...)` call that
   sends the payload to your Phase 2 server (or, if Phase 2 isn't built yet,
   note this as the guard that should wrap it once it exists) and wrap it
   per the comment at the top of `kill-switch.js`.

2. **Rule tagging (Feature 7).** Copy `core/rule-tags.js` into your real
   `core/`. In `core/detector.js`, add one `matchedRule: RULE_TAGS.XXX` field
   to each branch that currently pushes a `DetectionResult` — this is
   additive, it does not change any existing detection logic. Thread
   `matchedRule` through to the popup's dashboard rendering as a tooltip.

3. **Skeleton sanitizer (Feature 3, client half).** Copy
   `core/skeleton-sanitizer.js` into your real `core/`. Wherever your DOM
   skeleton is built (this logic doesn't exist yet per your README — it's a
   Phase 2 concern, per the PRD module spec's Module 2 §2.2), pass the raw
   tree through `sanitizeSkeleton()` before it's attached to any network
   payload.

4. **Adversarial fixtures (Feature 8).** Run
   `benchmark/merge-adversarial-fixtures.js` against your real
   `benchmark/` folder (see the script's header comment for exact usage —
   it detects your `ground-truth.json`'s shape rather than assuming one, and
   backs up the original before writing). Then run your existing
   `npm run benchmark` and compare the new numbers to your current 100%/100%
   — expect them to drop, and treat that drop as the honest number, per the
   addendum's own reasoning.

5. **Placeholder redaction (Feature 2) and action cache (Feature 4)** are
   Lane B — wire these in once Phase 1/2/3 are locked, not before. Both have
   INTEGRATION POINT comments at the top of their files.

6. **Prompt-injection server guard (Feature 3, server half)** and the
   **DPDP mapping (Feature 5)** apply once your Phase 2 server
   (`server/app.py` per the module spec) exists — `server/
   prompt_injection_guard.py` is ready to import at that point; `docs/
   DPDP_MAPPING.md` can go into your README/pitch deck immediately, no code
   dependency.

## What I did not do

I did not guess at or reconstruct your actual `core/detector.js`,
`content/redactor.js`, `content/content.js`, `background/background.js`, or
`popup/*` files, and I did not merge anything into your real
`ground-truth.json` — I don't have write access to files outside this
session's uploads, and guessing at unseen code risks silently diverging from
what you actually have. Everything above is built to attach to those files
with a small, explicit, documented change, on your side, when you're ready.
