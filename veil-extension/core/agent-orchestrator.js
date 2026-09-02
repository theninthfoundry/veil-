/**
 * VEIL — Autonomous Multi-Step Agent Orchestrator & Finite State Machine
 *
 * Enforces:
 *   1. Hard Step Budget (MAX_STEPS = 5) to prevent runaway loops.
 *   2. Re-perceive after EVERY action (protects against DOM mutation attacks).
 *   3. Finite State Machine:
 *      IDLE -> PERCEIVING -> AUDITING -> REASONING -> VALIDATING -> WAITING_FOR_HUMAN -> REVALIDATING -> EXECUTING -> RE_PERCEIVING -> FINISHED | BLOCKED
 *   4. Human-in-the-Loop Confirmation Gate on HIGH_RISK actions.
 *   5. Step-by-Step Telemetry & Tamper-Evident Ledger Logging.
 */

(function () {
  const MAX_STEPS = 5;
  const LOOP_TIMEOUT_MS = 30000;

  const STATES = {
    IDLE: 'IDLE',
    PERCEIVING: 'PERCEIVING',
    AUDITING: 'AUDITING',
    REASONING: 'REASONING',
    VALIDATING: 'VALIDATING',
    WAITING_FOR_HUMAN: 'WAITING_FOR_HUMAN',
    REVALIDATING: 'REVALIDATING',
    EXECUTING: 'EXECUTING',
    RE_PERCEIVING: 'RE_PERCEIVING',
    FINISHED: 'FINISHED',
    BLOCKED: 'BLOCKED',
    FAILED: 'FAILED',
    MAX_STEPS_REACHED: 'MAX_STEPS_REACHED'
  };

  /**
   * Orchestrates multi-step autonomous goal execution with human confirmation gating.
   */
  async function runAutonomousLoop(taskInstruction, callbacks = {}) {
    const {
      onStepUpdate = () => {},
      onComplete = () => {},
      scanAndRedactFn,
      buildContextFn,
      runAuditFn,
      callServerFn,
      resolveTargetFn,
      classifyRiskFn,
      confirmationFn = () => Promise.resolve(true),
      verifyIntegrityFn = () => ({ valid: true }),
      executeActionFn,
      recordEventFn,
      delayMs = 400
    } = callbacks;

    let currentStep = 0;
    let state = STATES.PERCEIVING;
    const stepTraces = [];
    const t0 = performance.now();

    recordEventFn('AGENT_TASK_STARTED', 'orchestrator', { task: taskInstruction, maxSteps: MAX_STEPS });

    while (currentStep < MAX_STEPS) {
      currentStep++;
      const stepT0 = performance.now();
      const stepIso = new Date().toISOString();

      // --- STEP 1: PERCEPTION ---
      state = STATES.PERCEIVING;
      onStepUpdate({ step: currentStep, state, message: `Step ${currentStep}: Scanning DOM & redacting PII...` });

      const detections = scanAndRedactFn();
      const sensitiveElements = new Set(detections.map(d => d.element).filter(Boolean));
      const context = buildContextFn(document, detections);

      // --- STEP 2: PRIVACY AUDIT ---
      state = STATES.AUDITING;
      const audit = runAuditFn(context, taskInstruction);
      if (audit.status !== 'PASS') {
        state = STATES.BLOCKED;
        recordEventFn('PRIVACY_AUDIT_BLOCKED', 'firewall', { step: currentStep, leaks: audit.leaks });
        const result = { ok: false, state, reason: 'Privacy Invariant Violation (Payload Contained Unredacted Data)', stepTraces, totalMs: Math.round(performance.now() - t0) };
        onComplete(result);
        return result;
      }

      recordEventFn('PRIVACY_AUDIT_PASSED', 'firewall', { step: currentStep, sensitiveCount: audit.sensitiveRegions, leakedCount: 0 });

      // --- STEP 3: REMOTE REASONING ---
      state = STATES.REASONING;
      onStepUpdate({ step: currentStep, state, message: `Step ${currentStep}: Remote VLM reasoning over sanitized skeleton...` });

      let serverResponse;
      try {
        serverResponse = await callServerFn(taskInstruction, context);
      } catch (err) {
        state = STATES.FAILED;
        const result = { ok: false, state, reason: `Server communication failed: ${err.message}`, stepTraces, totalMs: Math.round(performance.now() - t0) };
        onComplete(result);
        return result;
      }

      if (!serverResponse || !serverResponse.ok) {
        state = STATES.FAILED;
        const result = { ok: false, state, reason: (serverResponse && serverResponse.error) || 'Invalid server response', stepTraces, totalMs: Math.round(performance.now() - t0) };
        onComplete(result);
        return result;
      }

      const action = serverResponse.action;

      // Check Terminal Action
      if (action.action === 'none' || action.action === 'finish' || action.action === 'wait') {
        state = STATES.FINISHED;
        recordEventFn('AGENT_TASK_FINISHED', 'orchestrator', { step: currentStep, reasoning: action.reasoning || 'Goal completed' });
        stepTraces.push({
          step: currentStep,
          action: action.action,
          target: 'Goal Complete',
          durationMs: Math.round(performance.now() - stepT0),
          status: 'FINISHED'
        });
        const result = { ok: true, state, stepsTaken: currentStep, reason: action.reasoning || 'Task complete', stepTraces, totalMs: Math.round(performance.now() - t0) };
        onComplete(result);
        return result;
      }

      // --- STEP 4: VALIDATION & RISK CLASSIFICATION ---
      state = STATES.VALIDATING;
      let targetElement = resolveTargetFn(action.target, document);
      const risk = classifyRiskFn(action, targetElement, sensitiveElements);

      recordEventFn('ACTION_RISK_EVALUATED', 'safety_guard', { step: currentStep, level: risk.level, allowed: risk.allowed, reason: risk.reason });

      if (!risk.allowed) {
        state = STATES.BLOCKED;
        recordEventFn('ACTION_BLOCKED', 'safety_guard', { step: currentStep, reason: risk.reason });
        stepTraces.push({
          step: currentStep,
          action: action.action,
          target: (action.target && (action.target.description || action.target.text)) || 'Unknown Target',
          durationMs: Math.round(performance.now() - stepT0),
          status: 'BLOCKED',
          reason: risk.reason
        });
        const result = { ok: false, state, reason: `Action Blocked by Safety Guard: ${risk.reason}`, stepTraces, totalMs: Math.round(performance.now() - t0) };
        onComplete(result);
        return result;
      }

      // --- STEP 4b: HIGH-RISK HUMAN CONFIRMATION GATE ---
      if (risk.level === 'HIGH_RISK' || risk.requiresConfirmation) {
        state = STATES.WAITING_FOR_HUMAN;
        onStepUpdate({
          step: currentStep,
          state,
          message: `Step ${currentStep}: ⚠ HIGH_RISK Action Proposed ("${(action.target && action.target.description) || 'Purchase'}") — Awaiting Human Confirmation...`
        });
        recordEventFn('HUMAN_CONFIRMATION_REQUESTED', 'safety_guard', { step: currentStep, action: action.action, target: action.target });

        // Genuinely pause FSM awaiting human click
        const userApproved = await confirmationFn({
          action,
          targetElement,
          riskInfo: risk,
          origin: (typeof location !== 'undefined' && location.origin) || 'Local Origin'
        });

        if (!userApproved) {
          state = STATES.BLOCKED;
          recordEventFn('HUMAN_CONFIRMATION_DENIED', 'safety_guard', { step: currentStep });
          stepTraces.push({
            step: currentStep,
            action: action.action,
            target: (action.target && (action.target.description || action.target.text)) || 'High Risk Action',
            durationMs: Math.round(performance.now() - stepT0),
            status: 'BLOCKED',
            reason: 'User denied confirmation or authorization expired'
          });
          const result = { ok: false, state, reason: 'High-risk action aborted: explicit human authorization was denied or timed out.', stepTraces, totalMs: Math.round(performance.now() - t0) };
          onComplete(result);
          return result;
        }

        recordEventFn('HUMAN_CONFIRMATION_APPROVED', 'safety_guard', { step: currentStep });

        // --- STEP 4c: PRE-EXECUTION REVALIDATION (State integrity after modal) ---
        state = STATES.REVALIDATING;
        const integrityCheck = verifyIntegrityFn(action, targetElement, document);
        if (!integrityCheck.valid) {
          state = STATES.BLOCKED;
          recordEventFn('MUTATION_TRAP_BLOCKED', 'safety_guard', { step: currentStep, reason: integrityCheck.reason });
          const result = { ok: false, state, reason: `Action aborted after approval: ${integrityCheck.reason}`, stepTraces, totalMs: Math.round(performance.now() - t0) };
          onComplete(result);
          return result;
        }
        if (integrityCheck.resolvedElement) {
          targetElement = integrityCheck.resolvedElement;
        }
      }

      // --- STEP 5: EXECUTION ---
      state = STATES.EXECUTING;
      const execResult = executeActionFn(action, targetElement, sensitiveElements, (typeof location !== 'undefined' && location.hostname) || 'localhost');
      const stepDuration = Math.round(performance.now() - stepT0);

      stepTraces.push({
        step: currentStep,
        action: action.action,
        valueRef: action.valueRef || null,
        target: (action.target && (action.target.description || action.target.text)) || (targetElement ? targetElement.tagName : 'Screen'),
        durationMs: stepDuration,
        status: execResult.ok ? 'EXECUTED' : 'EXECUTION_FAILED',
        secretUsed: execResult.secretUsed ? execResult.secretId : null
      });

      if (execResult.secretUsed) {
        recordEventFn('SECRET_USED_LOCALLY', 'vault', {
          step: currentStep,
          secretId: execResult.secretId,
          target: (action.target && action.target.description) || 'DOM element',
          origin: (typeof location !== 'undefined' && location.hostname) || 'localhost'
        });
      }

      if (!execResult.ok) {
        state = STATES.FAILED;
        const result = { ok: false, state, reason: `Execution failed: ${execResult.reason}`, stepTraces, totalMs: Math.round(performance.now() - t0) };
        onComplete(result);
        return result;
      }

      // --- STEP 6: RE-PERCEIVE DELAY (Let DOM settle) ---
      state = STATES.RE_PERCEIVING;
      onStepUpdate({ step: currentStep, state, message: `Step ${currentStep} executed. Re-perceiving updated DOM...`, stepTraces });
      await new Promise(res => setTimeout(res, delayMs));
    }

    // Step budget exceeded
    state = STATES.MAX_STEPS_REACHED;
    recordEventFn('AGENT_MAX_STEPS_REACHED', 'orchestrator', { steps: MAX_STEPS });
    const result = {
      ok: true,
      state,
      stepsTaken: currentStep,
      reason: `Step budget of ${MAX_STEPS} reached. Handing control to user.`,
      stepTraces,
      totalMs: Math.round(performance.now() - t0)
    };
    onComplete(result);
    return result;
  }

  const agentOrchestratorExport = { runAutonomousLoop, STATES, MAX_STEPS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = agentOrchestratorExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilAgentOrchestrator = agentOrchestratorExport;
  }
})();
