# VEIL — Visual Perception & OCR Validation Report

**Auditor**: Independent Forensic Verification Authority  
**Date**: September 2, 2026

---

## 1. Forensic Inspection of `core/visual-ocr.js`

### Finding: **Option B — Heuristic Text Extraction via Element Attributes**

Inspection of [`core/visual-ocr.js`](file:///d:/veil/veil-extension/core/visual-ocr.js#L30-L50) reveals:

```javascript
    // 1. Inspect Canvas Elements
    if (element.tagName === 'CANVAS' || element._isMockCanvas) {
      if (element.dataset && element.dataset.canvasText) {
        extractedText = element.dataset.canvasText;
      } else if (element._canvasTextBuffer) {
        extractedText = element._canvasTextBuffer;
      } else if (element.getContext) {
        extractedText = element.getAttribute('data-visual-content') || '';
      }
...
```

### What this actually is:
1. It is **NOT** a compiled WebAssembly neural optical character recognition engine (e.g. Tesseract.js WASM, PaddleOCR ONNX, or EasyOCR).
2. It is an **on-device text extractor that reads canvas operation buffers or metadata attributes (`data-canvas-text`)** from HTML elements, and passes the resulting text to the span-arbitrated PII detector (`core/detector.js`).
3. For face detection, [`content/vision-fallback.js`](file:///d:/veil/veil-extension/content/vision-fallback.js) uses `Transformers.js` (`Xenova/face-detection`) when WebGPU/WASM is available.

---

## 2. Accurate Technical Characterization

- **DOM Perception**: 100% Real (DOM TreeWalker).
- **Attribute / Regex PII Engine**: 100% Real (Span-arbitrated regex with Luhn checks).
- **Visual OCR Perception**: **Heuristic Prototype / Test-Harness Extraction**. In a true production environment with arbitrary raw canvas pixels without data attributes, a compiled WASM OCR engine (such as Tesseract WASM) is required to parse raw RGB bitmaps.
