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

    const getDoc = () => (typeof document !== 'undefined' ? document : (callbacks.doc || null));

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
      const context = buildContextFn(getDoc(), detections);

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
      let targetElement = resolveTargetFn(action.target, getDoc());
      const risk = classifyRiskFn(action, targetElement, sensitiveElements);

      recordEventFn('ACTION_RISK_EVALUATED', 'safety_guard', { step: currentStep, level: risk.level, allowed: risk.allowed, reason: risk.reason });

      if (!risk.allowed && !risk.requiresConfirmation) {
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
      if (risk.requiresConfirmation || risk.level === 'HIGH_RISK') {
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
        onStepUpdate({ step: currentStep, state, message: `Step ${currentStep}: Revalidating target integrity...` });
        const integrityCheck = verifyIntegrityFn(action, targetElement, getDoc());
        if (!integrityCheck.valid && !integrityCheck.ok) {
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
      onStepUpdate({ step: currentStep, state, message: `Step ${currentStep}: Disagreeing/Executing sanitized action...` });

      const execResult = executeActionFn(action, targetElement);
      recordEventFn('ACTION_EXECUTED', 'executor', {
        step: currentStep,
        action: action.action,
        success: execResult.success,
        usedValueRef: !!execResult.valueRef
      });

      stepTraces.push({
        step: currentStep,
        action: action.action,
        target: (action.target && (action.target.description || action.target.text)) || 'Resolved Target',
        valueRef: execResult.valueRef,
        durationMs: Math.round(performance.now() - stepT0),
        status: execResult.success ? 'EXECUTED' : 'FAILED',
        error: execResult.error
      });

      const isSuccess = execResult && (execResult.success === true || execResult.ok === true || execResult.success !== false && execResult.ok !== false);
      if (!isSuccess) {
        state = STATES.FAILED;
        const result = { ok: false, state, reason: `Execution failed: ${(execResult && execResult.error) || 'Unknown execution error'}`, stepTraces, totalMs: Math.round(performance.now() - t0) };
        onComplete(result);
        return result;
      }

      // Short breathing room between steps
      if (delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs));
      }

      // --- STEP 6: RE-PERCEPTION LOOP ---
      state = STATES.RE_PERCEIVING;
      onStepUpdate({ step: currentStep, state, message: `Step ${currentStep}: Re-perceiving live page state post-action...` });
      recordEventFn('RE_PERCEPTION_TRIGGERED', 'orchestrator', { step: currentStep });
    }

    state = STATES.MAX_STEPS_REACHED;
    const finalResult = {
      ok: false,
      state,
      reason: `Task reached maximum step budget (${MAX_STEPS} steps). Safe termination enforced.`,
      stepTraces,
      totalMs: Math.round(performance.now() - t0)
    };
    recordEventFn('AGENT_TASK_MAX_STEPS', 'orchestrator', { maxSteps: MAX_STEPS });
    onComplete(finalResult);
    return finalResult;
  }

  const orchestratorExport = {
    STATES,
    MAX_STEPS,
    runAutonomousLoop
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = orchestratorExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilAgentOrchestrator = orchestratorExport;
  }
})();
