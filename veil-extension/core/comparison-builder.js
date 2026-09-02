/**
 * VEIL — comparison data builder
 *
 * Powers the side-by-side "your browser vs what would leave the device"
 * view. Reads real field values -- this is the one place in the codebase
 * that deliberately does, because the whole point of the view is to show
 * the person what's on their screen next to what's sanitized. That data
 * stays inside the extension's own messaging (content script -> popup ->
 * chrome.storage.session -> comparison page) and is never sent to the
 * server -- the server only ever sees what context-builder.js produces.
 */

(function () {
  const domUtils = typeof module !== 'undefined' && module.exports ? require('./dom-utils') : window.VeilDomUtils;
  const { labelFor } = domUtils;

  function elementValue(el) {
    if ('value' in el && el.value) return String(el.value);
    return (el.textContent || '').trim().slice(0, 120);
  }

  /**
   * @param {Document} document
   * @param {Array<{element: Element|null}>} detections — from scanForPII
   * @returns {{fields: Array<{label: string, value: string|null, sensitive: boolean, tag: string}>, generatedAt: number}}
   */
  function buildComparisonData(document, detections) {
    const sensitiveElements = new Set((detections || []).map((d) => d.element).filter(Boolean));
    const nodes = document.querySelectorAll('input, textarea, select, button, a[href]');
    const fields = [];

    nodes.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const isFormField = tag === 'input' || tag === 'textarea' || tag === 'select';
      fields.push({
        label: labelFor(el),
        value: isFormField ? elementValue(el) : null,
        sensitive: sensitiveElements.has(el),
        tag,
      });
    });

    return { fields, generatedAt: Date.now() };
  }

  const comparisonBuilderExport = { buildComparisonData };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = comparisonBuilderExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilComparisonBuilder = comparisonBuilderExport;
  }
})();
