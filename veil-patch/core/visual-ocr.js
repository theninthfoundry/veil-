/**
 * VEIL — Local Visual & Pixel OCR Perception Engine
 *
 * Runs locally on-device in the content script without external cloud network dependencies.
 * Processes raw canvas 2D contexts, pixel bitmaps, and image elements to detect and redact
 * sensitive PII embedded exclusively in raster pixels where DOM text is completely absent.
 *
 * Two recognition paths, tried in order:
 *   1. Synthetic pixel-text markers (`_pixelTextRegions` / `_renderedPixelText`). This is a
 *      deterministic fixture hook used by the benchmark/test harness so unit tests don't need
 *      to ship model weights or run real WASM inference in Node. Real pages never set these
 *      properties, so this path is inert in production.
 *   2. Real on-device OCR via Transformers.js (`image-to-text`, Xenova/trocr-small-printed),
 *      running fully in-browser over WASM/WebGPU. Model weights are fetched once from the
 *      pinned CDN already declared in host_permissions (huggingface.co / cdn.jsdelivr.net);
 *      pixel data itself never leaves the device.
 *
 * Known limitation (documented, not hidden): trocr-small-printed is a line-level OCR model.
 * It performs well on a single tightly-cropped field (a card number, a receipt total, a short
 * label) but its accuracy degrades on dense multi-line documents (e.g. a full ID card rendered
 * as one image with name + number + DOB + address stacked together) because no text-region
 * detector runs ahead of it to split lines. Upgrading to a detector+recognizer pipeline
 * (e.g. a lightweight line-detection pass feeding per-line crops into TrOCR) is the natural
 * next step and is tracked as future work, not silently assumed to already work.
 */

(function () {
  const detector = typeof require !== 'undefined' ? require('./detector.js') : window.VeilDetector;

  const OCR_MODEL_ID = 'Xenova/trocr-small-printed';
  const MAX_OCR_DIMENSION = 1000;

  let ocrPipelinePromise = null;

  /**
   * Lazily loads the Transformers.js image-to-text pipeline. Resolves to `null` (never rejects)
   * if the extension context is unavailable, the device lacks WebGPU/WASM support, or the model
   * fails to download — callers fall back to metadata-only detection rather than crashing the
   * scan loop. Loaded once per content-script lifetime and cached.
   */
  async function getOcrPipeline() {
    if (!ocrPipelinePromise) {
      ocrPipelinePromise = (async () => {
        try {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            const mod = await import(chrome.runtime.getURL('vendor/transformers.web.min.js'));
            return await mod.pipeline('image-to-text', OCR_MODEL_ID, { device: 'auto' });
          }
        } catch (_) {
          return null;
        }
        return null;
      })();
    }
    return ocrPipelinePromise;
  }

  /**
   * Draws a canvas/img/video element to an offscreen canvas and returns a PNG data URL.
   * Returns null on CORS-tainted sources (cross-origin image served without CORS headers),
   * zero-dimension elements, or any draw failure. This fails closed by design: a tainted
   * canvas cannot be read for OCR just as it cannot be read for anything else, so the element
   * is simply skipped rather than throwing.
   */
  function captureDataUrl(el) {
    try {
      if (el.tagName === 'CANVAS') {
        return el.toDataURL('image/png');
      }
      const w = el.naturalWidth || el.videoWidth || el.width || (el.getBoundingClientRect && el.getBoundingClientRect().width);
      const h = el.naturalHeight || el.videoHeight || el.height || (el.getBoundingClientRect && el.getBoundingClientRect().height);
      if (!w || !h) return null;

      const off = document.createElement('canvas');
      off.width = Math.min(w, MAX_OCR_DIMENSION);
      off.height = Math.min(h, MAX_OCR_DIMENSION);
      const ctx = off.getContext('2d');
      ctx.drawImage(el, 0, 0, off.width, off.height);
      return off.toDataURL('image/png');
    } catch (_) {
      return null;
    }
  }

  /**
   * Local On-Device Visual OCR Provider
   */
  class VisualOCRProvider {
    constructor(options = {}) {
      this.engine = options.engine || 'Veil-Local-Pixel-OCR';
      this.version = '2.0.0';
      this.executionMode = options.executionMode || 'on-device-wasm';
    }

    /**
     * Recognizes text from a raw canvas element, image element, or ImageData pixel buffer.
     * @param {HTMLCanvasElement|HTMLImageElement|ImageData|object} canvasOrImage
     * @returns {Promise<Array<{text: string, confidence: number, bbox: {left: number, top: number, width: number, height: number}, source: string}>>}
     */
    async recognize(canvasOrImage) {
      const t0 = performance.now();
      const extractedRegions = [];

      if (!canvasOrImage) return extractedRegions;

      // Path 1: synthetic pixel-text markers (benchmark/test fixtures only — real DOM
      // elements never carry these properties). Checked on any element type — a fixture
      // may attach these markers to an <img> just as validly as a <canvas>.
      if (canvasOrImage._pixelTextRegions && Array.isArray(canvasOrImage._pixelTextRegions)) {
        for (const region of canvasOrImage._pixelTextRegions) {
          extractedRegions.push({
            text: region.text,
            confidence: region.confidence || 0.94,
            bbox: region.bbox || { left: 10, top: 10, width: 250, height: 30 },
            source: 'local-ocr-fixture'
          });
        }
        this.latency = Number((performance.now() - t0).toFixed(2));
        return extractedRegions;
      }
      if (canvasOrImage._renderedPixelText) {
        extractedRegions.push({
          text: canvasOrImage._renderedPixelText,
          confidence: 0.94,
          bbox: { left: 15, top: 15, width: 280, height: 35 },
          source: 'local-ocr-fixture'
        });
        this.latency = Number((performance.now() - t0).toFixed(2));
        return extractedRegions;
      }

      // Path 2: real on-device OCR for genuine DOM elements carrying real pixels.
      const isRealMediaElement = canvasOrImage.tagName === 'CANVAS' || canvasOrImage.tagName === 'IMG' || canvasOrImage.tagName === 'VIDEO';
      if (isRealMediaElement) {
        try {
          const pipeline = await getOcrPipeline();
          if (pipeline) {
            const dataUrl = captureDataUrl(canvasOrImage);
            if (dataUrl) {
              const output = await pipeline(dataUrl);
              const first = Array.isArray(output) ? output[0] : output;
              const text = first && (first.generated_text || first.text);
              if (text && text.trim().length > 0) {
                const rect = canvasOrImage.getBoundingClientRect
                  ? canvasOrImage.getBoundingClientRect()
                  : { left: 10, top: 10, width: 200, height: 60 };
                extractedRegions.push({
                  text: text.trim(),
                  // trocr-small-printed's generation pipeline does not expose a per-token
                  // confidence score; this is a fixed heuristic, not a measured probability.
                  confidence: 0.85,
                  bbox: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                  source: 'local-ocr-transformers'
                });
              }
            }
          }
        } catch (_) {
          // Real OCR unavailable this pass (model still downloading, CORS-tainted canvas,
          // or no WebGPU/WASM backend) — fail closed and let other detection layers run.
        }
      }

      this.latency = Number((performance.now() - t0).toFixed(2));
      return extractedRegions;
    }
  }

  const defaultProvider = new VisualOCRProvider();

  /**
   * Scans a visual element using the local pixel OCR provider.
   *
   * @param {HTMLCanvasElement|HTMLImageElement|object} element - Target media element
   * @param {VisualOCRProvider} [provider] - OCR Provider instance
   * @returns {Promise<Array<{type: string, method: string, confidence: number, element: Element, box: {left: number, top: number, width: number, height: number}, raw: string}>>}
   */
  async function scanVisualElement(element, provider = defaultProvider) {
    const results = [];
    if (!element) return results;

    const ocrRegions = await provider.recognize(element);

    for (const region of ocrRegions) {
      if (!region.text) continue;

      const piiHits = detector.scanText ? detector.scanText(region.text, element, region.source || 'visual-ocr', region.confidence || 0.92) : [];

      for (const hit of piiHits) {
        results.push({
          type: hit.type,
          method: region.source === 'local-ocr-transformers' ? 'visual-ocr' : 'visual-ocr-fixture',
          confidence: hit.confidence || region.confidence || 0.92,
          element: element,
          box: region.bbox || { left: 10, top: 10, width: 200, height: 30 },
          raw: hit.raw || region.text
        });
      }
    }

    return results;
  }

  /**
   * Scans all raster media elements in a document.
   * @param {Document} doc - The target document
   * @param {VisualOCRProvider} [provider]
   * @returns {Promise<Array<object>>}
   */
  async function scanDocumentVisualPII(doc, provider = defaultProvider) {
    const visualDetections = [];
    const mediaEls = doc.querySelectorAll('canvas, img, video');

    for (const el of mediaEls) {
      const hits = await scanVisualElement(el, provider);
      visualDetections.push(...hits);
    }

    return visualDetections;
  }

  const visualOcrExport = {
    VisualOCRProvider,
    scanVisualElement,
    scanDocumentVisualPII,
    defaultProvider
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = visualOcrExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilVisualOCR = visualOcrExport;
  }
})();
