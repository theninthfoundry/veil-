/**
 * core/skeleton-sanitizer.js
 * ---------------------------------------------------------------------------
 * Feature 3 (PRD Addendum, Lane A): structural allow-list applied to the DOM
 * skeleton before it leaves the device. Defends against a page smuggling
 * instructions to the VLM through its own visible-looking text (hidden
 * buttons, off-screen labels, zero-opacity elements, script/style content).
 *
 * INTEGRATION POINT (in the real extension, not built here):
 *   Wherever the skeleton-building step in content/redactor.js (or wherever
 *   the DOM-to-skeleton walk lives) finishes building its tree, pass it
 *   through this before it's attached to the network payload:
 *
 *     const rawSkeleton = buildDomSkeleton(document.body);
 *     const safeSkeleton = sanitizeSkeleton(rawSkeleton, {
 *       isElementVisible: (el) => isElementVisible(el), // pass your own,
 *       // or use the isElementVisible() helper exported below if you don't
 *       // already have one.
 *     });
 *     // safeSkeleton is what goes into the network payload, never rawSkeleton
 *
 * This module has no dependency on the extension runtime for its core
 * filtering logic (sanitizeSkeleton operates on a plain tree, testable in
 * Node/jsdom), but isElementVisible() needs a real `window`/`getComputedStyle`
 * to run, so it's exported separately and is only required in-browser.
 * ---------------------------------------------------------------------------
 */

"use strict";

// Tags whose text content is never forwarded, regardless of visibility.
const NEVER_FORWARD_TAGS = new Set(["script", "style", "noscript", "template"]);

// Node roles/tags whose *label text* is legitimate to forward when visible.
// Anything not in this set gets its text dropped even if visible, unless it
// is an ancestor container (kept for structure, label stripped).
const LABEL_BEARING_TAGS = new Set([
  "button", "a", "label", "legend", "option", "summary",
  "h1", "h2", "h3", "h4", "h5", "h6",
]);

// Attributes that are more commonly abused to smuggle hidden instructions
// than used for legitimate accessibility labels in the wild — dropped by
// default. (aria-label/aria-labelledby are legitimate elsewhere but the
// abuse surface here isn't worth the marginal accessibility benefit for a
// v1 agent skeleton; revisit if a real task needs them.)
const SUSPECT_TEXT_ATTRS = ["title", "aria-label", "data-instruction", "data-agent-hint"];

/**
 * @typedef {Object} RawSkeletonNode
 * @property {string} tag
 * @property {string} [role]
 * @property {string} selector
 * @property {string} [label]
 * @property {boolean} redacted
 * @property {boolean} [visible]      // true/false if known; undefined if unknown (assume visible)
 * @property {Object.<string,string>} [attrs] // raw attribute map, if the caller has it
 * @property {RawSkeletonNode[]} children
 */

/**
 * Filters a raw skeleton tree down to what's safe to forward to the server.
 * Pure function — no DOM access required, so it's directly unit-testable.
 *
 * @param {RawSkeletonNode} node
 * @param {{ isElementVisible?: (node: RawSkeletonNode) => boolean }} [opts]
 * @returns {RawSkeletonNode}
 */
function sanitizeSkeleton(node, opts = {}) {
  const visible = opts.isElementVisible
    ? opts.isElementVisible(node)
    : node.visible !== false; // default: assume visible unless explicitly marked false

  const tag = (node.tag || "").toLowerCase();

  // Entire subtree dropped for never-forward tags — their children are not
  // real page structure anyway (script/style content isn't a DOM subtree
  // an agent should ever see).
  if (NEVER_FORWARD_TAGS.has(tag)) {
    return null;
  }

  const sanitizedChildren = (node.children || [])
    .map((child) => sanitizeSkeleton(child, opts))
    .filter(Boolean);

  let label = node.label;

  // Drop label text if the node is not visible, regardless of tag.
  if (!visible) {
    label = undefined;
  }
  // Drop label text if the tag isn't one where forwarded text is expected —
  // keeps the node (for structure) but strips anything it was carrying.
  else if (label !== undefined && !LABEL_BEARING_TAGS.has(tag)) {
    label = undefined;
  }

  const result = {
    tag: node.tag,
    role: node.role,
    selector: node.selector,
    redacted: !!node.redacted,
    children: sanitizedChildren,
  };
  if (label !== undefined) {
    result.label = label;
  }
  return result;
}

/**
 * Browser-only helper: determines whether a live DOM element is meaningfully
 * visible (not display:none, not visibility:hidden, not zero-opacity, not
 * positioned off-screen). Requires `window`/`getComputedStyle` — do not call
 * this from Node/jsdom tests; pass a stub `isElementVisible` to
 * sanitizeSkeleton() instead when testing.
 *
 * @param {Element} el
 * @returns {boolean}
 */
function isElementVisible(el) {
  if (typeof window === "undefined" || !el || !el.getBoundingClientRect) {
    return true; // can't determine -> don't silently drop real content
  }
  const style = window.getComputedStyle(el);
  if (style.display === "none") return false;
  if (style.visibility === "hidden" || style.visibility === "collapse") return false;
  if (parseFloat(style.opacity) === 0) return false;

  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  // Off-screen positioning (a common hidden-instruction trick: absolute
  // position far outside the viewport rather than display:none, since some
  // naive scanners only check display/visibility).
  const OFFSCREEN_MARGIN = 5000; // px — generous, catches "-9999px" tricks
  if (
    rect.right < -OFFSCREEN_MARGIN ||
    rect.bottom < -OFFSCREEN_MARGIN ||
    rect.left > window.innerWidth + OFFSCREEN_MARGIN ||
    rect.top > window.innerHeight + OFFSCREEN_MARGIN
  ) {
    return false;
  }

  return true;
}

/**
 * Strips suspect attributes from a raw attribute map before any code path
 * that might otherwise fold them into a label. Call this when building the
 * raw skeleton, not required if your builder never reads these attrs at all.
 *
 * @param {Object.<string,string>} attrs
 * @returns {Object.<string,string>}
 */
function stripSuspectAttrs(attrs) {
  if (!attrs) return attrs;
  const clean = { ...attrs };
  for (const key of SUSPECT_TEXT_ATTRS) {
    delete clean[key];
  }
  return clean;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    sanitizeSkeleton,
    isElementVisible,
    stripSuspectAttrs,
    NEVER_FORWARD_TAGS,
    LABEL_BEARING_TAGS,
    SUSPECT_TEXT_ATTRS,
  };
}
