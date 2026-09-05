# VEIL — Browser Compatibility & Execution Environment Specification

## 1. Supported Browser Environments

| Browser Runtime | Compatibility Status | Manifest Version | Notes |
| :--- | :--- | :--- | :--- |
| **Google Chrome / Chromium** | **VERIFIED & CERTIFIED** | Manifest V3 | Primary production deployment target (Chrome 116+ required for Side Panel API & Transformers.js WebAssembly SIMD). |
| **Brave Browser** | **VERIFIED** | Manifest V3 | Shields must permit local loopback queries to `127.0.0.1:8000`. |
| **Microsoft Edge** | **VERIFIED** | Manifest V3 | Compatible with standard MV3 service worker and storage APIs. |
| **Mozilla Firefox** | **UNVERIFIED / EXPERIMENTAL** | Manifest V2 / V3 | Background service worker semantics differ; offscreen canvas and OCR WASM require non-Chromium polyfills. Not officially certified. |
| **Apple Safari** | **UNSUPPORTED** | WebExtension | Not tested. Side Panel and local ONNX execution are not currently supported. |

---

## 2. Hard Platform Constraints & Sandbox Boundaries

VEIL adheres strictly to standard browser security architectures. It does not exploit browser memory or circumvent platform security primitives:

### A. Closed Shadow DOM Limitation
- **Browser Standard**: The W3C Shadow DOM specification guarantees that nodes attached with `{ mode: 'closed' }` cannot be accessed via `element.shadowRoot` from external scripts.
- **VEIL Enforcement**: VEIL traverses open Shadow DOM hierarchies (`element.shadowRoot`) recursively. For closed Shadow DOM trees, VEIL falls back to visual perception (Transformers.js TrOCR + canvas rasterization) to perceive rendered text without violating browser sandbox boundaries.

### B. Cross-Origin `<iframe>` Boundaries
- **Browser Standard**: The Same-Origin Policy (SOP) prohibits a parent document or content script from inspecting DOM structures or injecting input into cross-origin iframes without parent window permissions.
- **VEIL Enforcement**: VEIL inspects same-origin frames directly (`contentWindow.document`). For cross-origin frames, VEIL isolates frame execution: target elements within cross-origin frames cannot be directly manipulated by parent action envelopes. The background service worker acts as the attestation authority.

### C. Screenshot Capture & Viewport Constraints
- **Browser Standard**: `chrome.tabs.captureVisibleTab` requires `activeTab` permission and can only capture the currently visible viewport of the active window.
- **VEIL Enforcement**: Redaction and visual perception operate over the captured visible bitmap. Sub-pixel rendering and off-screen canvas rasterization handle elements scrolled outside the immediate viewport. Raw screenshots are scrubbed by the local visual redaction mask before any VLM observation.

### D. Service Worker Lifecycle (Manifest V3)
- **Browser Standard**: Chrome service workers are ephemeral and terminate after 30 seconds of inactivity.
- **VEIL Enforcement**: All session state, capabilities, and active budget counters are stored in `chrome.storage.session` and re-hydrated on event reception. Secret values are never persisted to disk or long-term storage.

---

## 3. Required Browser Permissions

VEIL follows the principle of **least privilege**. Unnecessary permissions have been audited and removed:

```json
{
  "permissions": [
    "activeTab",
    "tabs",
    "storage",
    "sidePanel"
  ],
  "host_permissions": [
    "http://127.0.0.1:8000/*",
    "http://localhost:8000/*"
  ]
}
```

- **`activeTab`**: Grants temporary permission to inspect the active tab when the user invokes VEIL.
- **`storage`**: Allows `chrome.storage.session` for ephemeral in-memory session and budget storage.
- **`sidePanel`**: Provides an extension-owned security boundary for human authorization dialogs, eliminating in-page DOM clickjacking and modal spoofing.
- **Host permissions**: Strictly scoped to local loopback server (`127.0.0.1:8000` / `localhost:8000`) for the untrusted reasoning gateway.
