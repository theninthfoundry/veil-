/**
 * core/kill-switch.js
 * ---------------------------------------------------------------------------
 * Feature 1 (PRD Addendum, Lane A): fail-closed guard in front of the one
 * network call VEIL ever makes.
 *
 * INTEGRATION POINT (in the real extension, not built here):
 *   Wherever background.js currently does something like:
 *
 *     fetch(SERVER_URL, { method: "POST", body: JSON.stringify(payload) })
 *
 *   wrap it as:
 *
 *     const verdict = assertRedactionVerified(detectionResults, redactionResult);
 *     if (!verdict.ok) {
 *       reportBlocked(verdict.reason); // -> popup "blocked — redaction unverified" state
 *       return; // network call never fires
 *     }
 *     fetch(SERVER_URL, ...)
 *
 * Deliberately dumb: this does NOT re-check pixels (that's the benchmark
 * harness's job, offline, against ground truth). It only checks that the
 * redaction stage ran and its output is internally consistent with what
 * detection found. A missing/mismatched result is the signal.
 * ---------------------------------------------------------------------------
 */

"use strict";

/**
 * @typedef {Object} DetectionResult
 * @property {string} id
 * @property {string} type
 * @property {string} [domSelector]
 */

/**
 * @typedef {Object} RedactionBox
 * @property {string} detectionId
 * @property {string} type
 * @property {"blackout"|"blur"} method
 */

/**
 * @typedef {Object} RedactionResult
 * @property {string} sanitizedScreenshotDataUrl
 * @property {RedactionBox[]} appliedBoxes
 */

/**
 * @typedef {Object} KillSwitchVerdict
 * @property {boolean} ok
 * @property {string} [reason]
 * @property {Object} [detail]
 */

/**
 * Verify that every detection has a corresponding applied redaction box,
 * and that the sanitized screenshot actually exists, before allowing the
 * one network call to proceed.
 *
 * @param {DetectionResult[]} detectionResults
 * @param {RedactionResult|null|undefined} redactionResult
 * @returns {KillSwitchVerdict}
 */
function assertRedactionVerified(detectionResults, redactionResult) {
  if (!Array.isArray(detectionResults)) {
    return { ok: false, reason: "NO_DETECTION_INPUT" };
  }

  // Nothing detected -> nothing to redact -> safe to proceed even with an
  // "empty" redaction result, as long as one was actually produced.
  if (detectionResults.length === 0) {
    if (!redactionResult || typeof redactionResult.sanitizedScreenshotDataUrl !== "string") {
      return { ok: false, reason: "REDACTION_STAGE_DID_NOT_RUN" };
    }
    return { ok: true };
  }

  if (!redactionResult) {
    return { ok: false, reason: "REDACTION_STAGE_DID_NOT_RUN" };
  }

  if (
    typeof redactionResult.sanitizedScreenshotDataUrl !== "string" ||
    !redactionResult.sanitizedScreenshotDataUrl.startsWith("data:image/")
  ) {
    return { ok: false, reason: "SANITIZED_SCREENSHOT_MISSING_OR_MALFORMED" };
  }

  if (!Array.isArray(redactionResult.appliedBoxes)) {
    return { ok: false, reason: "APPLIED_BOXES_MISSING" };
  }

  const detectionIds = new Set(detectionResults.map((d) => d.id));
  const boxedIds = new Set(redactionResult.appliedBoxes.map((b) => b.detectionId));

  const missing = [...detectionIds].filter((id) => !boxedIds.has(id));
  if (missing.length > 0) {
    return {
      ok: false,
      reason: "DETECTION_WITHOUT_APPLIED_REDACTION",
      detail: { missingDetectionIds: missing },
    };
  }

  // Every applied box should reference a real detection — a box that
  // references nothing is a sign the pipeline state is out of sync between
  // stages (e.g. stale data from a previous page load leaking into this one).
  const orphaned = [...boxedIds].filter((id) => !detectionIds.has(id));
  if (orphaned.length > 0) {
    return {
      ok: false,
      reason: "APPLIED_REDACTION_WITHOUT_MATCHING_DETECTION",
      detail: { orphanedBoxIds: orphaned },
    };
  }

  return { ok: true };
}

/**
 * Human-readable strings for the popup's "blocked — redaction unverified"
 * state, keyed by the machine reason above.
 */
const BLOCKED_REASON_MESSAGES = {
  NO_DETECTION_INPUT: "Detection stage produced no input — request blocked.",
  REDACTION_STAGE_DID_NOT_RUN: "Redaction stage did not run — request blocked before send.",
  SANITIZED_SCREENSHOT_MISSING_OR_MALFORMED: "Sanitized screenshot missing or malformed — request blocked.",
  APPLIED_BOXES_MISSING: "Redaction produced no box record — request blocked.",
  DETECTION_WITHOUT_APPLIED_REDACTION: "A detected field has no matching redaction — request blocked.",
  APPLIED_REDACTION_WITHOUT_MATCHING_DETECTION: "Redaction state is out of sync with detections — request blocked.",
};

function describeVerdict(verdict) {
  if (verdict.ok) return "Redaction verified — proceeding.";
  return BLOCKED_REASON_MESSAGES[verdict.reason] || `Blocked: ${verdict.reason}`;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { assertRedactionVerified, describeVerdict, BLOCKED_REASON_MESSAGES };
}
