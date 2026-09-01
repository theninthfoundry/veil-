/**
 * core/placeholder-redactor.js
 * ---------------------------------------------------------------------------
 * Feature 2 (PRD Addendum, Lane B): format-preserving placeholder redaction.
 *
 * This is an OPT-IN alternative to blackout/blur — it does not replace the
 * default (blackout stays the demo default because its zero-leakage
 * guarantee is simpler to verify). This module answers "what would the
 * harder, more useful version look like" and is meant to be demoed
 * side-by-side with blackout, not to silently become the default path.
 *
 * IMPORTANT: this module only ever produces a placeholder STRING or a
 * describes how one should be drawn — it never receives or touches the raw
 * PII value itself beyond reading its type and, for card numbers, its digit
 * COUNT (needed to preserve grouping length). It must never be passed a raw
 * value and asked to derive a "realistic-looking" placeholder from it — see
 * the "explicitly deferred" note in the PRD addendum. Fixed placeholders
 * only.
 *
 * INTEGRATION POINT (in the real extension, not built here):
 *   In content/redactor.js, alongside the existing blackout/blur drawing
 *   logic, add a mode switch:
 *
 *     const mode = getRedactionMode(); // "blackout" (default) | "placeholder"
 *     if (mode === "placeholder" && supportsPlaceholder(detection.type)) {
 *       const text = buildPlaceholder(detection.type, detection.rawValueLength);
 *       drawPlaceholderText(canvasCtx, detection.boundingBox, text); // your own canvas text draw
 *     } else {
 *       drawBlackoutBox(canvasCtx, detection.boundingBox); // existing default path
 *     }
 *
 *   `detection.rawValueLength` (a count, not the value) would need to be
 *   threaded from core/detector.js — a one-field addition, not a redesign.
 * ---------------------------------------------------------------------------
 */

"use strict";

const SUPPORTED_TYPES = new Set(["email", "credit_card", "phone", "name", "cvv"]);

const FIXED_PLACEHOLDERS = Object.freeze({
  name: "Jane Doe",
  // email: domain-aware, built dynamically (see buildPlaceholder)
  cvv: "000",
});

/**
 * @param {string} type - one of the 8 PiiType values
 * @returns {boolean}
 */
function supportsPlaceholder(type) {
  return SUPPORTED_TYPES.has(type);
}

/**
 * Builds a format-preserving placeholder for a given PII type.
 *
 * @param {string} type
 * @param {Object} [opts]
 * @param {number} [opts.digitGroupLengths] - e.g. [4,4,4,4] for a 16-digit
 *        card grouped in 4s; used for credit_card only, so the placeholder
 *        matches the real value's visual layout without encoding its digits.
 * @param {string} [opts.emailDomain] - e.g. "gmail.com"; if provided (and
 *        only the domain, never the local part), the placeholder keeps it,
 *        since some tasks legitimately need domain info ("confirm the .edu
 *        email") without needing the real address.
 * @returns {string}
 */
function buildPlaceholder(type, opts = {}) {
  switch (type) {
    case "name":
      return FIXED_PLACEHOLDERS.name;

    case "cvv":
      return FIXED_PLACEHOLDERS.cvv;

    case "email": {
      const domain = typeof opts.emailDomain === "string" && opts.emailDomain.trim()
        ? sanitizeDomain(opts.emailDomain)
        : "example.com";
      return `xxxx.xxxxx@${domain}`;
    }

    case "phone":
      // Keeps a generic country-code shape without encoding real digits.
      return "+00 00000 00000";

    case "credit_card": {
      const groups = Array.isArray(opts.digitGroupLengths) && opts.digitGroupLengths.length > 0
        ? opts.digitGroupLengths
        : [4, 4, 4, 4]; // default: most common visible grouping
      return groups.map((len) => "0".repeat(Math.max(1, Math.min(len, 6)))).join(" ");
    }

    default:
      throw new Error(`buildPlaceholder: unsupported type "${type}" — check supportsPlaceholder() first`);
  }
}

/**
 * Only the domain portion is ever accepted here — this function does not
 * accept or process a local-part/username under any circumstance, since that
 * would defeat the purpose of the feature.
 * @param {string} domain
 * @returns {string}
 */
function sanitizeDomain(domain) {
  // Strip anything that looks like it could be a local-part smuggled in via
  // a caller bug (e.g. someone passing a full address by mistake) — keep
  // only what's after the last "@" if one is present, else the input as-is.
  const atIndex = domain.lastIndexOf("@");
  const candidate = atIndex >= 0 ? domain.slice(atIndex + 1) : domain;
  // Basic domain-shape check; falls back to a generic domain if it doesn't
  // look like one, rather than forwarding something unexpected.
  return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(candidate) ? candidate.toLowerCase() : "example.com";
}

/**
 * Leakage self-check for this mode specifically: given a real value and the
 * placeholder generated for it, assert the placeholder shares no substring
 * of length >= 3 with the real value (beyond the intentionally-kept email
 * domain, which is a deliberate, documented exception — see the "Why it's
 * worth it" note in the PRD addendum). Intended for use by the benchmark
 * harness (Module 4), not at runtime.
 *
 * @param {string} rawValue
 * @param {string} placeholder
 * @param {{allowDomainMatch?: boolean}} [opts]
 * @returns {{ leaked: boolean, sharedSubstrings: string[] }}
 */
function checkPlaceholderLeakage(rawValue, placeholder, opts = {}) {
  const shared = [];
  const minLen = 3;
  const lowerRaw = rawValue.toLowerCase();
  const lowerPlaceholder = placeholder.toLowerCase();

  for (let start = 0; start < lowerPlaceholder.length; start++) {
    for (let len = minLen; start + len <= lowerPlaceholder.length; len++) {
      const substr = lowerPlaceholder.slice(start, start + len);
      if (lowerRaw.includes(substr)) {
        shared.push(substr);
      }
    }
  }

  const domainAllowed = opts.allowDomainMatch === true;
  // Allow matches against the domain portion, with or without the leading
  // "@" (a shared substring straddling the "@" — e.g. "@gmail.com" — is
  // still just the domain, not a local-part leak).
  const rawDomainWithAt = `@${lowerRaw.split("@").pop()}`;
  const meaningfulLeaks = domainAllowed
    ? shared.filter((s) => !rawDomainWithAt.includes(s))
    : shared;

  return { leaked: meaningfulLeaks.length > 0, sharedSubstrings: [...new Set(meaningfulLeaks)] };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { supportsPlaceholder, buildPlaceholder, checkPlaceholderLeakage, SUPPORTED_TYPES };
}
