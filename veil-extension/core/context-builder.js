/**
 * VEIL — context builder
 *
 * Produces the ONLY thing that's allowed to leave the device for a task:
 * a list of interactive elements with their tag, role, and a human-readable
 * label — never a field's current value, sensitive or not. Tags each element
 * in the live DOM with a stable data-veil-id so the server can reference one
 * unambiguously without ever seeing pixel coordinates.
 */

(function () {
  const domUtils = typeof module !== 'undefined' && module.exports ? require('./dom-utils') : window.VeilDomUtils;
  const { labelFor } = domUtils;

  const INTERACTIVE_SELECTOR = 'button, a[href], input, textarea, select, [role="button"]';

  /**
   * @param {Document} document
   * @param {Array<{element: Element|null}>} detections — from scanForPII, used only to set the `sensitive` flag
   * @returns {{ elements: Array<{id: string, tag: string, type: string|null, label: string, sensitive: boolean}> }}
   */
  /**
 * Builds structural context stripped of all field values.
 * @param {Document} document - Target webpage document
 * @param {Array<Object>} detections - PII detections
 */
function buildSanitizedContext(document, detections) {
    const sensitiveElements = new Set((detections || []).map((d) => d.element).filter(Boolean));
    const nodes = document.querySelectorAll(INTERACTIVE_SELECTOR);
    const elements = [];
    let counter = 0;

    nodes.forEach((el) => {
      let veilId = el.getAttribute('data-veil-id');
      if (!veilId) {
        veilId = `el-${counter}`;
        el.setAttribute('data-veil-id', veilId);
      }
      counter += 1;

      elements.push({
        id: veilId,
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || null,
        label: labelFor(el),
        sensitive: sensitiveElements.has(el),
        // deliberately no `value` field — see module docstring
      });
    });

    return { elements };
  }

  const contextBuilderExport = { buildSanitizedContext };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = contextBuilderExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilContextBuilder = contextBuilderExport;
  }
})();
