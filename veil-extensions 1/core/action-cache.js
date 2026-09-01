/**
 * core/action-cache.js
 * ---------------------------------------------------------------------------
 * Feature 4 (PRD Addendum, Lane B): short-lived, in-memory action-graph
 * cache. Skips a network round-trip when the DOM skeleton and task
 * instruction are provably unchanged since the last server call — never
 * persisted to disk, never survives a page load, and always falls through
 * to a normal server call on any uncertainty. A cache miss is the safe,
 * correct default; a cache hit is a bonus.
 *
 * INTEGRATION POINT (in the real extension, not built here — background.js
 * per the manifest, since that's what would own the capture loop once
 * Phase 2 exists):
 *
 *     const cache = createActionCache();
 *
 *     async function runCaptureCycle(pageLoadId, domSkeleton, taskInstruction, liveDomLookup) {
 *       const cached = cache.get(pageLoadId, domSkeleton, taskInstruction);
 *       if (cached && liveDomLookup(cached.actionTarget) /* element still exists *\/) {
 *         return cached.actionTarget; // skip the network call entirely
 *       }
 *       const actionTarget = await callServer(...); // existing/normal path
 *       cache.set(pageLoadId, domSkeleton, taskInstruction, actionTarget);
 *       return actionTarget;
 *     }
 * ---------------------------------------------------------------------------
 */

"use strict";

/**
 * Deterministic, dependency-free string hash (djb2 variant) — good enough
 * for cache-key purposes (not cryptographic use), and works in any JS
 * context (content script, background service worker, Node tests) without
 * needing SubtleCrypto's async API.
 * @param {string} str
 * @returns {string}
 */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * @param {Object} domSkeleton
 * @returns {string}
 */
function hashSkeleton(domSkeleton) {
  // Compact, key-sorted JSON so structurally-identical skeletons hash
  // identically regardless of object key insertion order.
  return hashString(stableStringify(domSkeleton));
}

function stableStringify(obj) {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/**
 * @typedef {Object} ActionCacheEntry
 * @property {string} skeletonHash
 * @property {string} taskInstruction
 * @property {Object} actionTarget
 * @property {number} setAtMs
 */

const DEFAULT_MAX_AGE_MS = 60_000; // conservative: never reuse anything older than 60s,
                                    // even within the same page load — pages can change
                                    // in ways the skeleton hash alone might not fully capture
                                    // (e.g. a value change inside a node the skeleton doesn't track).

function createActionCache(opts = {}) {
  const maxAgeMs = typeof opts.maxAgeMs === "number" ? opts.maxAgeMs : DEFAULT_MAX_AGE_MS;
  /** @type {Map<string, ActionCacheEntry>} */
  const store = new Map();

  /**
   * @param {string} pageLoadId
   * @param {Object} domSkeleton
   * @param {string} taskInstruction
   * @returns {ActionCacheEntry|null} null on any miss (page changed, task
   *          changed, entry expired, or no entry yet) — every miss reason
   *          collapses to "call the server normally," by design.
   */
  function get(pageLoadId, domSkeleton, taskInstruction) {
    const entry = store.get(pageLoadId);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.setAtMs > maxAgeMs) {
      store.delete(pageLoadId);
      return null;
    }

    const currentHash = hashSkeleton(domSkeleton);
    if (currentHash !== entry.skeletonHash) return null;
    if (taskInstruction !== entry.taskInstruction) return null;

    return entry;
  }

  /**
   * @param {string} pageLoadId
   * @param {Object} domSkeleton
   * @param {string} taskInstruction
   * @param {Object} actionTarget
   */
  function set(pageLoadId, domSkeleton, taskInstruction, actionTarget) {
    store.set(pageLoadId, {
      skeletonHash: hashSkeleton(domSkeleton),
      taskInstruction,
      actionTarget,
      setAtMs: Date.now(),
    });
  }

  /** Call on page unload / new page load to avoid stale cross-page reuse. */
  function invalidate(pageLoadId) {
    store.delete(pageLoadId);
  }

  function clear() {
    store.clear();
  }

  function size() {
    return store.size;
  }

  return { get, set, invalidate, clear, size };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { createActionCache, hashSkeleton, hashString, DEFAULT_MAX_AGE_MS };
}
