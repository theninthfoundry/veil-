# VEIL — Limitations, Failure Modes & Security Boundaries

## 1. Zero-Trust Transparency Statement

Security systems that claim "100% security" or "unhackable" guarantees are fundamentally untruthful. VEIL is a local security kernel designed to significantly reduce the attack surface of autonomous AI browser agents through defense-in-depth:
- Local perception and structural sanitization
- Capability-based secret isolation
- Single-use human authorization gates
- Pre-execution TOCTOU mutation guards
- Cryptographic egress payload auditing

This document establishes the precise technical boundaries, known limitations, and edge-case failure modes of VEIL v1.0.

---

## 2. Architectural & Platform Boundaries

### A. Closed Shadow DOM Trees
- **Constraint**: Under the W3C Web Components standard, `{ mode: 'closed' }` Shadow DOM roots intentionally block access from script `element.shadowRoot` calls.
- **VEIL Behavior**: Structural DOM traversal cannot inspect internal nodes of closed shadow roots.
- **Defense-in-Depth**: VEIL's visual perception engine (Transformers.js / Canvas rasterization) scans the rendered viewport to detect visual PII rendered inside closed shadow roots, but cannot construct semantic accessibility trees for those specific hidden elements.

### B. Cross-Origin `<iframe>` Isolation
- **Constraint**: The browser's Same-Origin Policy (SOP) strictly prevents scripts executing in window A from reading or modifying the DOM of window B if they originate from different protocols, domains, or ports.
- **VEIL Behavior**: If a webpage embeds a third-party payment iframe from an external origin, VEIL's top-frame content script cannot directly traverse or manipulate that iframe's DOM.
- **Defense-in-Depth**: VEIL registers content scripts across all accessible frames. Each frame operates its own local perception and security barrier. Actions cannot switch frames without explicit authority.

### C. Adversarial Visual Perturbations & CAPTCHAs
- **Constraint**: Highly stylized bot-detection CAPTCHAs, noisy animated canvases, or adversarial neural perturbations designed to fool OCR models cannot be guaranteed to yield 100% text recognition accuracy on-device.
- **VEIL Behavior**: VEIL is a privacy and execution firewall, not a CAPTCHA solver or universal image classifier. When unresolvable or high-risk visual elements are encountered, VEIL fails closed: it pauses execution and transfers control to the human user (`REQUIRE_HUMAN`).

### D. WebGL and 3D Shader Rendering
- **Constraint**: Continuous real-time OCR extraction across high-frequency 60fps WebGL 3D canvas streams imposes excessive CPU/GPU overhead.
- **VEIL Behavior**: VEIL samples static 2D Canvas buffers (`getContext('2d')`) and raster images. WebGL 3D animation loops are not continuously re-OCR'd on every frame.

### E. Emerging Prompt Injection & Semantic Jailbreaks
- **Constraint**: Remote VLMs receiving natural language instructions remain susceptible to sophisticated semantic jailbreaks that do not match existing syntactic markers.
- **VEIL Behavior**: VEIL does NOT rely solely on prompt filtering. Instead, VEIL assumes the remote model is untrusted. The model can only propose structured actions (`click`, `type`). It can NEVER receive raw credentials, execute arbitrary JavaScript, specify raw coordinates, or execute actions without local policy attestation.

---

## 3. Storage & Vault Boundaries

1. **Ephemeral In-Memory Secrets**:
   - The production VEIL Vault does not write raw user credentials to disk, unencrypted `localStorage`, or cloud backends.
   - Secrets are held in volatile memory and bound to active browser sessions.
2. **Capability Expiration**:
   - Secret capabilities expire after 60 seconds or immediately upon single-use injection.
   - If a multi-step workflow takes longer than the capability TTL, the agent must request a fresh capability attestation.

---

## 4. Fail-Closed Operating Invariant

Whenever an operational parameter is uncertain:
- OCR engine unavailable $\rightarrow$ do not claim visual security coverage; warn user or fail closed.
- Target element ambiguous $\rightarrow$ abort action.
- Target label mutated between reasoning and execution $\rightarrow$ abort execution immediately.
- Egress payload contains Canary Token $\rightarrow$ hard block before network dispatch.
- Origin mismatches capability policy $\rightarrow$ refuse secret resolution.
