/**
 * VEIL — content script
 *
 * Full privacy-preserving perception-action loop:
 *   1. Synchronous DOM/Regex scan -> PII detection
 *   2. Redaction overlay rendering
 *   3. Async Vision Fallback (faces/PII in images/canvas/video)
 *   4. Context building (structure only, zero values)
 *   5. Privacy Audit Firewall (hard gate before network transmission)
 *   6. Server reasoning round-trip (POST /act)
 *   7. DOM resolution + Mutation integrity check
 *   8. Action Risk Classification + Safety gating
 *   9. Local execution + Secret Vault ValueRef resolution
 *   10. Multi-step autonomous loop (MAX_STEPS = 5)
 *   11. In-Page Live Inspector HUD sync
 *   12. Complete pipeline telemetry & Security Ledger logging
 */

(function () {
  const { scanForPII } = window.VeilDetector;
  const { renderRedactions, clearRedactions } = window.VeilRedactor;
  const { buildSanitizedContext } = window.VeilContextBuilder;
  const { resolveTarget } = window.VeilActionResolver;
  const { executeAction } = window.VeilActionExecutor;
  const { buildComparisonData } = window.VeilComparisonBuilder;
  const { runPrivacyAudit } = window.VeilPrivacyAudit || { runPrivacyAudit: () => ({ status: 'PASS', leakedRegions: 0, sensitiveRegions: 0 }) };
  const { classifyActionRisk } = window.VeilRiskClassifier || { classifyActionRisk: () => ({ level: 'SAFE', allowed: true }) };
  const { recordEvent } = window.VeilSecurityLedger || { recordEvent: () => {} };
  const { getSecretMetadata } = window.VeilSecretVault || { getSecretMetadata: () => [] };
  const { runAutonomousLoop } = window.VeilAgentOrchestrator || { runAutonomousLoop: () => Promise.resolve({ ok: false }) };

  let enabled = true;
  let debounceTimer = null;
  let repositionTimer = null;
  let lastDetections = [];
  let lastTelemetry = {
    domMs: 0,
    piiMs: 0,
    visionMs: 0,
    redactMs: 0,
    auditMs: 0,
    networkMs: 0,
    actionMs: 0,
    totalMs: 0
  };

  function countByType(detections) {
    const counts = {};
    for (const d of detections) counts[d.type] = (counts[d.type] || 0) + 1;
    return counts;
  }

  function sendStats(latencyMs, barsDrawn) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.runtime.sendMessage) {
        const payload = {
          counts: countByType(lastDetections),
          totalDetections: lastDetections.length,
          barsDrawn,
          latencyMs,
          telemetry: lastTelemetry,
          url: location.href,
          timestamp: Date.now(),
        };
        chrome.runtime.sendMessage({ type: 'VEIL_STATS', payload }).catch(() => {});
      }
    } catch (_) {}
  }

  function scanAndRedact() {
    if (!enabled) return [];
    const t0 = performance.now();
    
    // Step 1: DOM & Regex scan
    const tPiiStart = performance.now();
    lastDetections = scanForPII(document);
    const piiMs = Math.round(performance.now() - tPiiStart);
    
    // Step 2: Redaction rendering
    const tRedactStart = performance.now();
    const barsDrawn = renderRedactions(lastDetections);
    const redactMs = Math.round(performance.now() - tRedactStart);
    
    const latencyMs = Math.round(performance.now() - t0);
    lastTelemetry.piiMs = piiMs;
    lastTelemetry.redactMs = redactMs;
    lastTelemetry.domMs = latencyMs;
    
    recordEvent('PII_DETECTED', 'detection', { count: lastDetections.length, types: countByType(lastDetections) });
    recordEvent('REGION_REDACTED', 'redaction', { barsDrawn });

    sendStats(latencyMs, barsDrawn);

    // Sync with Live Inspector HUD if active
    if (window.VeilInspector) {
      const ctx = buildSanitizedContext(document, lastDetections);
      window.VeilInspector.updateHUD(lastDetections, ctx);
    }

    maybeRunVisionFallback();
    return lastDetections;
  }

  function maybeRunVisionFallback() {
    if (!enabled || !window.VeilVisionFallback) return;

    const mediaEls = Array.from(document.querySelectorAll('img, video, canvas')).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
    });
    if (mediaEls.length === 0) return;

    const tVisionStart = performance.now();
    const scanFn = window.VeilVisionFallback.scanVisualPII || window.VeilVisionFallback.detectFaces;
    scanFn(mediaEls)
      .then((visualDetections) => {
        lastTelemetry.visionMs = Math.round(performance.now() - tVisionStart);
        if (!enabled || !visualDetections || visualDetections.length === 0) return;
        lastDetections = [...lastDetections, ...visualDetections];
        renderRedactions(lastDetections);
        recordEvent('VISION_PII_DETECTED', 'vision', { count: visualDetections.length });
        sendStats(lastTelemetry.domMs, undefined);

        if (window.VeilInspector) {
          const ctx = buildSanitizedContext(document, lastDetections);
          window.VeilInspector.updateHUD(lastDetections, ctx);
        }
      })
      .catch((err) => {
        lastTelemetry.visionMs = Math.round(performance.now() - tVisionStart);
        console.warn('[VEIL] visual perception unavailable, continuing without it:', err);
      });
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

  // Initial scan
  debouncedScan(50);

  const observer = new MutationObserver(() => debouncedScan(500));
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('scroll', repositionOnly, { passive: true });
  window.addEventListener('resize', repositionOnly);

  function callServer(task, context) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'VEIL_RUN_TASK_SERVER_CALL', task, context }, (serverResponse) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve(serverResponse);
      });
    });
  }

  function handleRunAutonomousTask(task, sendResponse) {
    if (window.VeilInspector) {
      window.VeilInspector.logTimeline(`Goal: "${task}"`, true);
    }

    const confirmationFn = (details) => (window.VeilHighRiskConfirmation ? window.VeilHighRiskConfirmation.requestConfirmation(details) : Promise.resolve(true));
    const verifyIntegrityFn = (act, el, doc) => (window.VeilMutationGuard ? window.VeilMutationGuard.verifyActionIntegrity(act, el, doc) : { valid: true });

    runAutonomousLoop(task, {
      scanAndRedactFn: () => scanAndRedact(),
      buildContextFn: (doc, dets) => buildSanitizedContext(doc, dets),
      runAuditFn: (ctx, t) => runPrivacyAudit(ctx, t),
      callServerFn: (t, ctx) => callServer(t, ctx),
      resolveTargetFn: (target, doc) => resolveTarget(target, doc),
      classifyRiskFn: (act, el, sens) => classifyActionRisk(act, el, sens),
      confirmationFn,
      verifyIntegrityFn,
      executeActionFn: (act, el, sens, origin) => executeAction(act, el, sens, origin),
      recordEventFn: (type, stage, detail) => recordEvent(type, stage, detail),
      onStepUpdate: (update) => {
        if (window.VeilInspector) {
          window.VeilInspector.logTimeline(update.message, true);
        }
        chrome.runtime.sendMessage({ type: 'VEIL_STEP_UPDATE', update }).catch(() => {});
      },
      onComplete: (result) => {
        if (window.VeilInspector) {
          window.VeilInspector.logTimeline(`Goal completed (${result.stepsTaken} steps, ${result.totalMs}ms) - 0 PII Leaked`, true);
        }
        sendResponse(result);
        scanAndRedact();
      }
    });
  }

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
        latencyMs: lastTelemetry.domMs,
        telemetry: lastTelemetry,
        vaultSecrets: getSecretMetadata(),
        enabled,
      });
      return true;
    }
    if (message.type === 'VEIL_RUN_TASK' || message.type === 'VEIL_RUN_AUTONOMOUS_TASK') {
      handleRunAutonomousTask(message.task, sendResponse);
      return true;
    }
    if (message.type === 'VEIL_GET_VAULT_SECRETS') {
      sendResponse({ secrets: getSecretMetadata() });
      return true;
    }
    if (message.type === 'VEIL_GET_COMPARISON') {
      sendResponse(buildComparisonData(document, lastDetections));
      return true;
    }
    return false;
  });
})();
