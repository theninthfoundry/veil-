/**
 * VEIL — vision fallback (phase 3)
 *
 * Detects faces in <img>, <video>, and <canvas> elements -- the one class
 * of PII the DOM/regex detector structurally cannot see. Only invoked when
 * such an element actually exists in the viewport (see content.js) --
 * loading a model for a page that's all text would be pure waste.
 *
 * Uses a general zero-shot object detector (Xenova/owlvit-base-patch32)
 * with the candidate label "human face", rather than a purpose-built face
 * model. That's not the ideal accuracy/speed trade-off, but this exact
 * model + label pair is Hugging Face's own documented example for
 * @huggingface/transformers' zero-shot-object-detection pipeline -- I
 * confirmed this by installing the package (v4.2.0) in the build
 * environment and reading its actual shipped type definitions and example,
 * rather than guessing a face-specific model repo name that might not
 * exist. A real, slightly-suboptimal choice beats a hallucinated one.
 *
 * ============================================================
 * GENUINELY UNVERIFIED -- read before you trust this for a demo
 * ============================================================
 * This build environment has no display, no WebGPU, and (per its network
 * allowlist) no route to huggingface.co or cdn.jsdelivr.net -- both of
 * which this module needs at runtime, the first time it loads a model, on
 * the machine that actually runs it. None of the code below has executed
 * successfully anywhere. It's written against the real package's real
 * types, which is a meaningfully better starting point than a blind guess,
 * but "compiles against the right API shape" is not the same as "works."
 *
 * Two consequences worth knowing about before a demo:
 *   1. The model downloads over the network the first time it runs (the
 *      browser then caches it). Pre-warm this on the demo machine before
 *      you're in front of judges -- don't let the first run happen live.
 *   2. This is the one part of VEIL where "local" means "computation runs
 *      on this device," not "no network access was needed, ever." The
 *      weights have to come from somewhere once. No user data leaves the
 *      device either way -- but it's a real nuance in the privacy pitch,
 *      not one to gloss over if a judge asks a sharp question about it.
 *
 * Wrapped in try/catch everywhere it's called from content.js specifically
 * so that if any of this is wrong, the rest of VEIL -- DOM detection,
 * redaction, the server round trip, all of which DO have passing automated
 * tests -- keeps working exactly as before.
 */

(function () {
  const MODEL_ID = 'Xenova/owlvit-base-patch32';
  const CANDIDATE_LABELS = ['human face'];
  const THRESHOLD = 0.3;

  let pipelinePromise = null;

  async function getDetector() {
    if (!pipelinePromise) {
      pipelinePromise = (async () => {
        const mod = await import(chrome.runtime.getURL('vendor/transformers.web.min.js'));
        // device: 'auto' lets the library pick WebGPU when available and
        // fall back on its own -- confirmed as a real, documented device
        // value in the package's own types/utils/devices.d.ts, not assumed.
        return mod.pipeline('zero-shot-object-detection', MODEL_ID, { device: 'auto' });
      })();
    }
    return pipelinePromise;
  }

  /** Draws the element's current frame to an offscreen canvas at its natural
   * resolution and returns a data URL, or null if the element has no usable
   * pixels yet, or is cross-origin without CORS headers (a tainted canvas
   * can't be read -- that element is skipped, not force-failed). */
  function captureFrame(el) {
    const naturalWidth = el.naturalWidth || el.videoWidth || el.width;
    const naturalHeight = el.naturalHeight || el.videoHeight || el.height;
    if (!naturalWidth || !naturalHeight) return null;

    const canvas = document.createElement('canvas');
    canvas.width = naturalWidth;
    canvas.height = naturalHeight;
    const ctx = canvas.getContext('2d');

    try {
      ctx.drawImage(el, 0, 0, naturalWidth, naturalHeight);
      return { dataUrl: canvas.toDataURL('image/png'), naturalWidth, naturalHeight };
    } catch (err) {
      return null;
    }
  }

  /**
   * @param {Element[]} mediaElements — img/video/canvas elements currently in the viewport
   * @returns {Promise<Array<{type: 'face', method: 'vision', confidence: number, element: Element, box: {left: number, top: number, width: number, height: number}}>>}
   */
  async function detectFaces(mediaElements) {
    if (!mediaElements || mediaElements.length === 0) return [];

    const detector = await getDetector();
    const results = [];

    for (const el of mediaElements) {
      const captured = captureFrame(el);
      if (!captured) continue;

      const rect = el.getBoundingClientRect();
      const scaleX = rect.width / captured.naturalWidth;
      const scaleY = rect.height / captured.naturalHeight;

      // eslint-disable-next-line no-await-in-loop -- sequential on purpose,
      // this is already the expensive path; don't also spike memory running
      // every media element's inference concurrently.
      const detections = await detector(captured.dataUrl, CANDIDATE_LABELS, {
        threshold: THRESHOLD,
        percentage: false,
      });

      for (const d of detections) {
        results.push({
          type: 'face',
          method: 'vision',
          confidence: d.score,
          element: el,
          box: {
            left: rect.left + d.box.xmin * scaleX,
            top: rect.top + d.box.ymin * scaleY,
            width: (d.box.xmax - d.box.xmin) * scaleX,
            height: (d.box.ymax - d.box.ymin) * scaleY,
          },
        });
      }
    }

    return results;
  }

  window.VeilVisionFallback = { detectFaces };
})();
