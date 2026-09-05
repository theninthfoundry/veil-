/**
 * VEIL — redactor
 *
 * Takes the detector's output and draws opaque overlay bars over each
 * detected element, positioned via getBoundingClientRect so the page's own
 * layout (labels, structure, buttons) stays fully visible — only the values
 * are covered. Runs in the content script, browser-only.
 *
 * Hovering a bar reveals the original value in a small local tooltip — it
 * never leaves the overlay DOM node, and nothing is sent anywhere. This is
 * a demo/debug affordance for the person using their own browser, not a
 * network-facing feature.
 */

(function () {
  const LAYER_ID = 'veil-redaction-layer';
  const STYLE_ID = 'veil-redaction-style';

  function ensureLayer() {
    let layer = document.getElementById(LAYER_ID);
    if (layer) return layer;

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        #${LAYER_ID} {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 2147483647;
        }
        .veil-bar {
          position: absolute;
          background: #0B0B0C;
          border: 1.5px solid #33449E;
          border-radius: 3px;
          pointer-events: auto;
          cursor: help;
          box-sizing: border-box;
        }
        .veil-bar:hover::after {
          content: "🔒 [PROTECTED BY VEIL — LOCAL ONLY]";
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          background: #14151A;
          color: #38d39f;
          font: 10px ui-monospace, "SF Mono", Menlo, monospace;
          padding: 3px 6px;
          border-radius: 3px;
          white-space: nowrap;
          z-index: 1;
          pointer-events: none;
          border: 1px solid #238636;
        }
      `;
      document.head.appendChild(style);
    }

    layer = document.createElement('div');
    layer.id = LAYER_ID;
    document.body.appendChild(layer);
    return layer;
  }

  // WeakMap holding sensitive values strictly inside isolated extension memory
  const internalSecretMemory = new WeakMap();

  /**
   * @param {Array<{type: string, element: Element|null, box?: {left:number,top:number,width:number,height:number}}>} detections
   * @returns {number} how many bars were actually drawn
   */
  function renderRedactions(detections) {
    const layer = ensureLayer();
    layer.innerHTML = '';

    let drawn = 0;
    const seen = new Set(); // one bar per element for whole-element detections only

    for (const d of detections) {
      let rect;

      if (d.box) {
        if (d.box.width <= 0 || d.box.height <= 0) continue;
        rect = d.box;
      } else {
        if (!d.element || seen.has(d.element)) continue;
        seen.add(d.element);
        const r = d.element.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        rect = { left: r.left, top: r.top, width: r.width, height: r.height };
      }

      const bar = document.createElement('div');
      bar.className = 'veil-bar';
      bar.style.left = `${rect.left}px`;
      bar.style.top = `${rect.top}px`;
      bar.style.width = `${rect.width}px`;
      bar.style.height = `${rect.height}px`;
      bar.dataset.veilType = d.type;
      bar.setAttribute('aria-hidden', 'true');

      // CRITICAL SECURITY INVARIANT:
      // NEVER mirror plaintext secrets into DOM attributes, CSS, or page-visible text.
      // The page DOM sees only the opaque class and type identifier.
      if (d.element) {
        internalSecretMemory.set(bar, { type: d.type, timestamp: Date.now() });
      }

      layer.appendChild(bar);
      drawn += 1;
    }

    return drawn;
  }

  function clearRedactions() {
    const layer = document.getElementById(LAYER_ID);
    if (layer) layer.innerHTML = '';
  }

  const redactorExport = { renderRedactions, clearRedactions };
  if (typeof window !== 'undefined') {
    window.VeilRedactor = redactorExport;
  }
})();
