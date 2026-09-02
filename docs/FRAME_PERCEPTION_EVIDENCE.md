# VEIL — Phase D: Shadow DOM & Multi-Frame Perception Evidence

**Document Date**: September 2, 2026  
**Auditor**: Browser Runtime & Web Component Perception Engine  
**Status**: VERIFIED & FROZEN FOR PHASE D

---

## 1. Modern Web Component & Frame Perception Invariant

Modern web applications construct interactive forms using custom Web Components (Shadow DOM) and isolated iframe boundaries.
Standard `document.querySelectorAll()` operations fail to traverse into `#shadow-root` nodes.

VEIL provides **Recursive Frame-Aware Perception (`core/dom-utils.js`)**:
1. **Recursive `shadowRoot` Traversal**: Recursively visits open `#shadow-root` nodes and nested shadow boundaries (`traverseAllNodes()`).
2. **Structural Shadow Path**: Tracks component hierarchy (e.g. `custom-checkout-component > nested-host-1`) for stable `data-veil-id` assignment.
3. **Isolated Frame Context**: Enforces strict origin and `frameId` tagging (`_veilFrameInfo`) on every element so sensitive data remains isolated within its respective origin boundary.

---

## 2. Multi-Component & Frame Verification Matrix

| Architecture Layer | Test Scenario | Expected Discovery | Observed Result | Status |
|---|---|---|---|---|
| **Light DOM** | Standard input field | Discovered at root | Discovered (`light-email`) | **PASS** |
| **Open Shadow Root** | Web Component form | Traverses `#shadow-root` | Discovered (`shadow-card`, `shadow-submit`) | **PASS** |
| **Nested Shadow Root** | Shadow root inside Shadow root | Recursively traverses depth 2+ | Discovered (`nested-cvv`) | **PASS** |
| **Same-Origin Frame** | Form in iframe | Discovered with `frameId` metadata | Scanned with `frame-payment-gate` ID | **PASS** |
| **Origin Integrity** | Cross-origin frame gate | Origin preserved without cross-origin leaks | Origin verified (`https://secure-gateway.in`) | **PASS** |

---

## 3. Results Summary

- **Shadow DOM Traversal**: Fully Verified (Light DOM, Shadow DOM, and Nested Shadow Roots).
- **Frame Isolation & Origin Tracking**: Verified.
- **Machine-Readable Telemetry**: Stored in `benchmark/results/frames.json`.
