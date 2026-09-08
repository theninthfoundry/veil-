/**
 * VEIL — Dynamic Information Flow Control (IFC) & Taint Engine
 *
 * Implements Invariant I5 & I6:
 * "Sensitive data cannot flow into untrusted sinks without an explicit Capability.
 *  Tainted credentials and financial secrets are strictly prohibited from flowing to remote models."
 *
 * Taint Security Lattice:
 *   PUBLIC (0) < INTERNAL (1) < PERSONAL (2) < SENSITIVE (3) < FINANCIAL_SECRET (4) < CREDENTIAL (5)
 */

(function () {
  const TAINT_LEVELS = {
    PUBLIC: 0,
    INTERNAL: 1,
    PERSONAL: 2,
    SENSITIVE: 3,
    FINANCIAL_SECRET: 4,
    CREDENTIAL: 5
  };

  const TAINT_NAMES = {
    0: 'PUBLIC',
    1: 'INTERNAL',
    2: 'PERSONAL',
    3: 'SENSITIVE',
    4: 'FINANCIAL_SECRET',
    5: 'CREDENTIAL'
  };

  const SINKS = {
    CLOUD_MODEL: 'CLOUD_MODEL',
    REMOTE_EGRESS: 'REMOTE_EGRESS',
    DOM_FORM: 'DOM_FORM',
    LOCAL_STORAGE: 'LOCAL_STORAGE',
    SECURITY_LEDGER: 'SECURITY_LEDGER'
  };

  // WeakMap associating DOM elements and objects with their active taint metadata
  const taintStore = new WeakMap();
  const stringTaintStore = new Map();

  class TaintEngine {
    constructor() {
      this.levels = TAINT_LEVELS;
      this.sinks = SINKS;
    }

    /**
     * Tags a target element or object with a taint level.
     *
     * @param {Element|object} target
     * @param {string|number} level - 'PUBLIC'|'PERSONAL'|'SENSITIVE'|'FINANCIAL_SECRET'|'CREDENTIAL'
     * @param {object} [metadata]
     */
    tag(target, level, metadata = {}) {
      if (!target) return;
      const numLevel = typeof level === 'number' ? level : (TAINT_LEVELS[level] || TAINT_LEVELS.PUBLIC);

      if (typeof target === 'object' && target !== null) {
        const existing = taintStore.get(target);
        const mergedLevel = existing ? Math.max(existing.level, numLevel) : numLevel;
        taintStore.set(target, {
          level: mergedLevel,
          name: TAINT_NAMES[mergedLevel],
          taggedAt: Date.now(),
          ...metadata
        });
      } else if (typeof target === 'string') {
        const existing = stringTaintStore.get(target);
        const mergedLevel = existing ? Math.max(existing.level, numLevel) : numLevel;
        stringTaintStore.set(target, {
          level: mergedLevel,
          name: TAINT_NAMES[mergedLevel],
          taggedAt: Date.now(),
          ...metadata
        });
      }
    }

    /**
     * Retrieves the taint level of an element or object.
     *
     * @param {Element|object|string} target
     * @returns {{ level: number, name: string }}
     */
    getTaint(target) {
      if (!target) return { level: TAINT_LEVELS.PUBLIC, name: 'PUBLIC' };

      if (typeof target === 'object' && target !== null) {
        return taintStore.get(target) || { level: TAINT_LEVELS.PUBLIC, name: 'PUBLIC' };
      }
      if (typeof target === 'string') {
        return stringTaintStore.get(target) || { level: TAINT_LEVELS.PUBLIC, name: 'PUBLIC' };
      }
      return { level: TAINT_LEVELS.PUBLIC, name: 'PUBLIC' };
    }

    /**
     * Combines multiple taint levels to compute the least upper bound (supremum).
     */
    joinTaints(...levels) {
      let maxLevel = TAINT_LEVELS.PUBLIC;
      for (const l of levels) {
        const num = typeof l === 'number' ? l : (TAINT_LEVELS[l] || 0);
        if (num > maxLevel) maxLevel = num;
      }
      return { level: maxLevel, name: TAINT_NAMES[maxLevel] };
    }

    /**
     * Contextual Entity Fusion:
     * Evaluates relational sensitivity. E.g. Name (PERSONAL) + Hospital Diagnosis (SENSITIVE) = CREDENTIAL/RESTRICTED.
     */
    evaluateContextualSensitivity(entities = []) {
      const types = new Set(entities.map(e => (e.type || e).toLowerCase()));

      // Rule: Name/ID + Medical -> High sensitivity health data
      if ((types.has('name') || types.has('aadhaar')) && (types.has('hospital') || types.has('diagnosis') || types.has('medical'))) {
        return { level: TAINT_LEVELS.CREDENTIAL, name: 'CREDENTIAL', reason: 'Contextual Fusion: Identity + Healthcare Diagnosis' };
      }

      // Rule: Amount + Account/Card -> Financial Secret
      if (types.has('amount') && (types.has('card') || types.has('bank_account') || types.has('cvv'))) {
        return { level: TAINT_LEVELS.FINANCIAL_SECRET, name: 'FINANCIAL_SECRET', reason: 'Contextual Fusion: Currency Amount + Payment Instrument' };
      }

      // Default: take highest individual entity taint
      let highest = TAINT_LEVELS.PUBLIC;
      for (const t of types) {
        if (t.includes('card') || t.includes('pan') || t.includes('bank')) highest = Math.max(highest, TAINT_LEVELS.FINANCIAL_SECRET);
        else if (t.includes('pass') || t.includes('secret') || t.includes('pin')) highest = Math.max(highest, TAINT_LEVELS.CREDENTIAL);
        else if (t.includes('email') || t.includes('phone') || t.includes('aadhaar')) highest = Math.max(highest, TAINT_LEVELS.PERSONAL);
      }

      return { level: highest, name: TAINT_NAMES[highest] };
    }

    /**
     * Verifies if an information flow from source to sink is permitted under security invariants.
     *
     * @param {number|string} sourceTaint
     * @param {string} sinkType - From SINKS
     * @param {object} context - { sourceOrigin, sinkOrigin, hasCapability }
     * @returns {{ allowed: boolean, reason: string }}
     */
    canFlow(sourceTaint, sinkType, context = {}) {
      const numLevel = typeof sourceTaint === 'number' ? sourceTaint : (TAINT_LEVELS[sourceTaint] || 0);

      // Invariant P1 & I5: Credentials and Financial Secrets CAN NEVER flow to Cloud Model
      if (sinkType === SINKS.CLOUD_MODEL) {
        if (numLevel >= TAINT_LEVELS.PERSONAL) {
          return {
            allowed: false,
            reason: `Information Flow Violation: Data labeled "${TAINT_NAMES[numLevel]}" is prohibited from entering Cloud Model reasoning context`
          };
        }
        return { allowed: true, reason: 'Public structural context permitted for reasoning' };
      }

      // Invariant I6: Tainted data cannot flow to foreign egress origins without capability
      if (sinkType === SINKS.REMOTE_EGRESS) {
        if (numLevel >= TAINT_LEVELS.SENSITIVE && !context.hasCapability) {
          return {
            allowed: false,
            reason: `Information Flow Violation: Tainted data (${TAINT_NAMES[numLevel]}) blocked from remote egress without explicit authorization`
          };
        }
      }

      // Ledger: Sensitive fields must be scrubbed before entering audit ledger
      if (sinkType === SINKS.SECURITY_LEDGER) {
        if (numLevel >= TAINT_LEVELS.FINANCIAL_SECRET) {
          return {
            allowed: false,
            reason: 'Plaintext secret values forbidden from audit ledger (must be scrubbed)'
          };
        }
      }

      // Domestic Injection into Form: Allowed if same-origin and capability verified
      if (sinkType === SINKS.DOM_FORM) {
        if (numLevel >= TAINT_LEVELS.FINANCIAL_SECRET && !context.hasCapability) {
          return {
            allowed: false,
            reason: `Local Secret Injection requires valid Action Capability for field ${context.targetField || 'unknown'}`
          };
        }
      }

      return { allowed: true, reason: 'Information flow complies with security lattice policy' };
    }

    /**
     * Creates a formal Provenance descriptor for a value or reference.
     *
     * @param {string|object} valueOrRef
     * @param {object} options
     * @param {string|number} options.level - Taint level
     * @param {string} options.origin - E.g. 'browser.form.password' or 'https://bank.example/login'
     * @param {string} [options.owner='user']
     * @param {string} [options.purpose='unrestricted']
     * @param {Array<string>} [options.allowedDestinations=[]]
     * @param {Array<string>} [options.derivedFrom=[]]
     * @param {Array<string>} [options.transformations=[]]
     * @returns {object} Formatted Provenance object
     */
    createProvenance(valueOrRef, options = {}) {
      const numLevel = typeof options.level === 'number'
        ? options.level
        : (TAINT_LEVELS[options.level] || TAINT_LEVELS.PUBLIC);

      return {
        level: numLevel,
        name: TAINT_NAMES[numLevel],
        origin: options.origin || 'unknown_origin',
        owner: options.owner || 'user',
        purpose: options.purpose || 'unrestricted',
        allowedDestinations: Array.isArray(options.allowedDestinations) ? [...options.allowedDestinations] : [],
        transformations: Array.isArray(options.transformations) ? [...options.transformations] : [],
        derivedFrom: Array.isArray(options.derivedFrom) ? [...options.derivedFrom] : [],
        timestamp: options.timestamp || Date.now(),
        policyConstraints: options.policyConstraints || {}
      };
    }

    /**
     * Tags a target with a complete Provenance record.
     */
    tagProvenance(target, provenance) {
      if (!target || !provenance) return;
      this.tag(target, provenance.level, { provenance });
    }

    /**
     * Retrieves the Provenance record of an element or object.
     */
    getProvenance(target) {
      const taint = this.getTaint(target);
      if (taint && taint.provenance) {
        return taint.provenance;
      }
      return this.createProvenance(target, { level: taint.level, origin: 'untracked' });
    }

    /**
     * Verifies if an information flow complies with both lattice rules and provenance constraints.
     *
     * @param {object} provenance - Full Provenance record
     * @param {string} sinkType - From SINKS
     * @param {object} context - { destination, purpose, hasCapability }
     * @returns {{ allowed: boolean, reason: string }}
     */
    canFlowWithProvenance(provenance, sinkType, context = {}) {
      if (!provenance) {
        return { allowed: true, reason: 'Untracked data default allowed' };
      }

      // 1. Check basic lattice flow
      const latticeCheck = this.canFlow(provenance.level, sinkType, context);
      if (!latticeCheck.allowed) {
        return latticeCheck;
      }

      // 2. Purpose Conformance check
      if (provenance.purpose && provenance.purpose !== 'unrestricted') {
        if (context.purpose && context.purpose !== provenance.purpose) {
          return {
            allowed: false,
            reason: `Provenance Violation: Data purpose is "${provenance.purpose}", but operation purpose is "${context.purpose}"`
          };
        }
      }

      // 3. Destination Whitelist check
      if (provenance.allowedDestinations && provenance.allowedDestinations.length > 0 && context.destination) {
        const destMatched = provenance.allowedDestinations.some(d =>
          context.destination.startsWith(d) || d.startsWith(context.destination)
        );
        if (!destMatched) {
          return {
            allowed: false,
            reason: `Provenance Violation: Destination "${context.destination}" is not authorized for this data`
          };
        }
      }

      return {
        allowed: true,
        reason: 'Information flow complies with provenance and security lattice policy'
      };
    }
  }

  const defaultTaintEngine = new TaintEngine();

  const exportObj = {
    TaintEngine,
    defaultTaintEngine,
    TAINT_LEVELS,
    TAINT_NAMES,
    SINKS,
    levels: TAINT_LEVELS,
    sinks: SINKS,
    tag: (t, l, m) => defaultTaintEngine.tag(t, l, m),
    getTaint: (t) => defaultTaintEngine.getTaint(t),
    canFlow: (st, sk, ctx) => defaultTaintEngine.canFlow(st, sk, ctx),
    evaluateContextualSensitivity: (e) => defaultTaintEngine.evaluateContextualSensitivity(e),
    createProvenance: (v, o) => defaultTaintEngine.createProvenance(v, o),
    tagProvenance: (t, p) => defaultTaintEngine.tagProvenance(t, p),
    getProvenance: (t) => defaultTaintEngine.getProvenance(t),
    canFlowWithProvenance: (p, s, c) => defaultTaintEngine.canFlowWithProvenance(p, s, c)
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportObj;
  }
  if (typeof window !== 'undefined') {
    window.VeilTaintEngine = exportObj;
  }
})();
