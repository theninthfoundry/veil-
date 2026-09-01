/**
 * VEIL — content script
 *
 * Loaded after detector.js and redactor.js (see manifest.json order), so
 * window.VeilDetector and window.VeilRedactor already exist.
 *
 * Phase 1 scope: local detection + redaction only. No server round-trip yet
 * — the "latency" reported here is detect+redact time on this device, not
 * an end-to-end pipeline number. Labeled that way in the popup deliberately.
 */

(function () {
  const { scanForPII } = window.VeilDetector;
  const { renderRedactions, clearRedactions } = window.VeilRedactor;

  let enabled = true;
  let debounceTimer = null;
  let repositionTimer = null;
  let lastDetections = [];
  let lastLatencyMs = null;

  function countByType(detections) {
    const counts = {};
    for (const d of detections) counts[d.type] = (counts[d.type] || 0) + 1;
    return counts;
  }

  function sendStats(latencyMs, barsDrawn) {
    const payload = {
      counts: countByType(lastDetections),
      totalDetections: lastDetections.length,
      barsDrawn,
      latencyMs,
      url: location.href,
      timestamp: Date.now(),
    };
    chrome.runtime.sendMessage({ type: 'VEIL_STATS', payload }).catch(() => {});
  }

  function scanAndRedact() {
    if (!enabled) return;
    const t0 = performance.now();
    lastDetections = scanForPII(document);
    const barsDrawn = renderRedactions(lastDetections);
    const latencyMs = Math.round(performance.now() - t0);
    lastLatencyMs = latencyMs;
    sendStats(latencyMs, barsDrawn);
  }

  function debouncedScan(delay) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(scanAndRedact, delay);
  }

  function repositionOnly() {
    clearTimeout(repositionTimer);
    repositionTimer = setTimeout(() => {
      if (enabled) renderRedactions(lastDetections);
    }, 50);
  }

  // Initial scan, shortly after content scripts load.
  debouncedScan(50);

  // Re-scan when the page's shape changes — SPA navigation, a form that
  // renders in after initial load, etc. Debounced so rapid mutations don't
  // trigger a scan storm.
  const observer = new MutationObserver(() => debouncedScan(500));
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Bars are positioned via getBoundingClientRect, which is viewport-relative
  // — reposition (cheap) rather than re-detect (not free) on scroll/resize.
  window.addEventListener('scroll', repositionOnly, { passive: true });
  window.addEventListener('resize', repositionOnly);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'VEIL_TOGGLE') {
      enabled = message.enabled;
      if (enabled) {
        scanAndRedact();
      } else {
        clearRedactions();
      }
      sendResponse({ ok: true, enabled });
      return true;
    }
    if (message.type === 'VEIL_GET_CURRENT_STATS') {
      sendResponse({
        counts: countByType(lastDetections),
        totalDetections: lastDetections.length,
        latencyMs: lastLatencyMs,
        enabled,
      });
      return true;
    }
    return false;
  });
})();
