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
          content: attr(data-veil-reveal);
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          background: #14151A;
          color: #F5F4F0;
          font: 11px ui-monospace, "SF Mono", Menlo, monospace;
          padding: 3px 6px;
          border-radius: 3px;
          white-space: nowrap;
          z-index: 1;
        }
      `;
      document.head.appendChild(style);
    }

    layer = document.createElement('div');
    layer.id = LAYER_ID;
    document.body.appendChild(layer);
    return layer;
  }

  function elementValue(el) {
    if (!el) return '';
    if ('value' in el && el.value) return String(el.value);
    return (el.textContent || '').trim().slice(0, 80);
  }

  /**
   * @param {Array<{type: string, element: Element|null}>} detections
   * @returns {number} how many bars were actually drawn (elements with a
   *   visible, positioned rect — hidden fields don't get a bar since there's
   *   nothing on screen to cover, but they still count in the stats)
   */
  function renderRedactions(detections) {
    const layer = ensureLayer();
    layer.innerHTML = '';

    let drawn = 0;
    const seen = new Set(); // one bar per element, even if it matched twice

    for (const d of detections) {
      if (!d.element || seen.has(d.element)) continue;
      seen.add(d.element);

      const rect = d.element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const bar = document.createElement('div');
      bar.className = 'veil-bar';
      bar.style.left = `${rect.left}px`;
      bar.style.top = `${rect.top}px`;
      bar.style.width = `${rect.width}px`;
      bar.style.height = `${rect.height}px`;
      bar.dataset.veilType = d.type;
      bar.setAttribute('aria-hidden', 'true');
      bar.dataset.veilReveal = `${d.type} — local only, never sent: ${elementValue(d.element)}`;

      layer.appendChild(bar);
      drawn += 1;
    }

    return drawn;
  }

  function clearRedactions() {
    const layer = document.getElementById(LAYER_ID);
    if (layer) layer.innerHTML = '';
  }

  const api = { renderRedactions, clearRedactions };
  if (typeof window !== 'undefined') {
    window.VeilRedactor = api;
  }
})();
