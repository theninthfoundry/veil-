/**
 * VEIL — Unified Session Manager (VEILSession)
 *
 * Implements the single authoritative session model across all VEIL UI surfaces:
 * Popup, Command Center, In-Page HUD, Live Lab, and Proof Mode.
 *
 * States:
 *   IDLE -> PERCEIVING -> SANITIZING -> REASONING -> VALIDATING ->
 *   WAITING_FOR_HUMAN -> REVALIDATING -> EXECUTING -> RE_PERCEIVING ->
 *   COMPLETED | BLOCKED | ABORTED
 */

(function () {
  const SESSION_STATES = {
    IDLE: 'IDLE',
    PERCEIVING: 'PERCEIVING',
    SANITIZING: 'SANITIZING',
    REASONING: 'REASONING',
    VALIDATING: 'VALIDATING',
    WAITING_FOR_HUMAN: 'WAITING_FOR_HUMAN',
    REVALIDATING: 'REVALIDATING',
    EXECUTING: 'EXECUTING',
    RE_PERCEIVING: 'RE_PERCEIVING',
    COMPLETED: 'COMPLETED',
    BLOCKED: 'BLOCKED',
    ABORTED: 'ABORTED'
  };

  class VEILSessionManager {
    constructor() {
      this.currentSession = this.createNewSession();
      this.listeners = new Set();
    }

    createNewSession(tabInfo = {}) {
      return {
        id: 'veil_sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5),
        startTime: Date.now(),
        tab: {
          id: tabInfo.id || 1,
          origin: tabInfo.origin || (typeof location !== 'undefined' ? location.origin : 'http://localhost:3000'),
          title: tabInfo.title || (typeof document !== 'undefined' ? document.title : 'Active Tab')
        },
        state: SESSION_STATES.IDLE,
        task: '',
        step: 0,
        maxSteps: 5,
        perception: {
          totalElements: 0,
          interactiveElements: 0,
          shadowRootsFound: 0,
          framesCount: 1,
          visualMediaCount: 0
        },
        privacy: {
          sensitiveDetections: [],
          redactedCount: 0,
          sanitizedElements: [],
          auditStatus: 'PASS',
          canaryStatus: 'SECURE',
          bytesTransmitted: 0,
          leakedBytes: 0
        },
        action: null,
        risk: null,
        telemetry: {
          perceptionMs: 0,
          sanitizationMs: 0,
          privacyAuditMs: 0,
          modelInferenceMs: 0,
          resolutionMs: 0,
          executionMs: 0,
          totalLoopMs: 0
        },
        events: []
      };
    }

    getSession() {
      return this.currentSession;
    }

    setState(newState, meta = {}) {
      this.currentSession.state = newState;
      this.recordEvent('STATE_CHANGED', 'session', { state: newState, ...meta });
      this.notify();
    }

    setTask(task) {
      this.currentSession.task = task;
      this.recordEvent('TASK_INITIALIZED', 'session', { task });
      this.notify();
    }

    updatePerception(stats) {
      this.currentSession.perception = { ...this.currentSession.perception, ...stats };
      this.notify();
    }

    updatePrivacy(privacyResult) {
      this.currentSession.privacy = { ...this.currentSession.privacy, ...privacyResult };
      this.notify();
    }

    setActionProposal(action, risk) {
      this.currentSession.action = action;
      this.currentSession.risk = risk;
      this.recordEvent('ACTION_PROPOSED', 'reasoner', { action, risk });
      this.notify();
    }

    updateTelemetry(timings) {
      this.currentSession.telemetry = { ...this.currentSession.telemetry, ...timings };
      this.notify();
    }

    recordEvent(type, source, details = {}) {
      const event = {
        id: 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
        timestamp: new Date().toISOString(),
        timeMs: Date.now() - this.currentSession.startTime,
        type,
        source,
        details
      };
      this.currentSession.events.push(event);
      this.notify();
      return event;
    }

    subscribe(listener) {
      this.listeners.add(listener);
      listener(this.currentSession);
      return () => this.listeners.delete(listener);
    }

    notify() {
      for (const listener of this.listeners) {
        try {
          listener(this.currentSession);
        } catch (e) {
          console.error('[VEIL Session] Listener error:', e);
        }
      }
    }

    reset() {
      this.currentSession = this.createNewSession(this.currentSession.tab);
      this.notify();
    }
  }

  const globalSession = new VEILSessionManager();

  const exportObj = {
    SESSION_STATES,
    VEILSessionManager,
    globalSession
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportObj;
  }
  if (typeof window !== 'undefined') {
    window.VeilSession = exportObj;
  }
})();
