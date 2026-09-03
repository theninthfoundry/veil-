# VEIL v1.0 — Known Limitations & Research Boundaries

This document provides a transparent, zero-trust summary of VEIL v1.0's operational scope, intentional security trade-offs, and future research directions.

---

## 1. Intentional Security & Architectural Scope

1. **Closed Shadow DOM Boundaries**:
   - *Behavior*: VEIL recursively penetrates open Shadow DOM trees up to depth 3. Elements located inside closed Shadow Roots (`mode: 'closed'`) cannot be traversed by DOM TreeWalkers per the browser security model.
   - *Mitigation*: Pixel OCR scans raster canvas and rendered screenshots unconditionally to detect visual PII regardless of Shadow DOM encapsulation.

2. **Cross-Origin Iframes**:
   - *Behavior*: Same-origin iframes are perceived and sanitized seamlessly. Cross-origin iframes without content script injection are treated as opaque external frames.
   - *Mitigation*: The extension content script is registered with `all_frames: true` in Manifest v3 to ensure local interception inside cross-origin child frames.

3. **Complex Stylized CAPTCHAs**:
   - *Behavior*: VEIL is an agent privacy & safety layer, not a CAPTCHA solver. When a third-party CAPTCHA challenge is detected, VEIL flags the step as requiring human intervention (`WAITING_FOR_HUMAN`).

4. **WebGL 3D Shader Rendering**:
   - *Behavior*: On-device Pixel OCR supports HTML5 2D Canvas buffers (`getContext('2d')`). High-frequency WebGL 3D vertex shader rendering is not continuously OCR-sampled to preserve client frame rates ($\ge 60\text{ fps}$).

---

## 2. Recommended Operating Environment

- **Browser**: Google Chrome v120+ (Manifest v3 compliant)
- **Local VLM Backend**: Ollama `qwen2-vl:7b-instruct-q4_K_M` running on `http://127.0.0.1:11434`
- **FastAPI Bridge**: Python 3.10+ running on `http://127.0.0.1:8000`
- **Local Client Latency Overhead**: $\le 4.71\text{ ms}$ (Local Perception, Sanitization & Policy Engine)
