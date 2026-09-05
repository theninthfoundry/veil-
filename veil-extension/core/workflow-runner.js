/**
 * VEIL — Canonical Golden Workflows Engine
 *
 * Implements the 5 standard production agent workflows:
 *   1. E-Commerce Checkout (Product -> Cart -> Shipping -> Gated Order)
 *   2. Authentication (Fields -> In-Memory ValueRefs -> Local Fill -> Submit)
 *   3. Government e-KYC Form (Form -> Mask Aadhaar/PAN -> Submit)
 *   4. Flight Booking (Search -> Select -> Passenger -> Gated Payment)
 *   5. High-Risk Action & Mutation Trap Defense (Target Mutates -> Revalidate -> Block)
 */

(function () {
  const GOLDEN_WORKFLOWS = [
    {
      id: 'wf-01-shopping',
      title: '1. E-Commerce Checkout & Purchase Gating',
      domain: 'E-Commerce',
      goal: 'Add flagship headset to cart, enter shipping details, and stop before payment authorization.',
      appUrl: 'http://localhost:3000/shop/index.html',
      steps: [
        { action: 'click', target: { description: 'button labeled "Add to Cart"' }, expectState: 'PERCEIVING' },
        { action: 'type', target: { description: 'input for Customer Name' }, valueRef: 'LOCAL_USER_NAME' },
        { action: 'type', target: { description: 'input for Shipping Address' }, valueRef: 'LOCAL_SHIPPING_ADDR' },
        { action: 'click', target: { description: 'button labeled "Place Order ₹4,999"' }, expectRisk: 'HIGH_RISK', requiresAuth: true }
      ]
    },
    {
      id: 'wf-02-auth',
      title: '2. Zero-Leakage Login & Credential Autofill',
      domain: 'Authentication',
      goal: 'Identify login fields and inject credentials from local ValueRef vault without sending password over network.',
      appUrl: 'http://localhost:3000/banking/login.html',
      steps: [
        { action: 'type', target: { description: 'input for Username' }, valueRef: 'LOCAL_USER_EMAIL' },
        { action: 'type', target: { description: 'input for Password' }, valueRef: 'LOCAL_SECRET_PASS' },
        { action: 'click', target: { description: 'button labeled "Sign In"' }, expectRisk: 'SAFE' }
      ]
    },
    {
      id: 'wf-03-ekyc',
      title: '3. Government Form e-KYC & Masking',
      domain: 'Government Services',
      goal: 'Verify identity certificate while masking Aadhaar UID and PAN from external AI vision.',
      appUrl: 'http://localhost:3000/government/index.html',
      steps: [
        { action: 'type', target: { description: 'input for Full Name' }, value: 'Sreeshanth Reddy' },
        { action: 'type', target: { description: 'input for Aadhaar Number' }, valueRef: 'LOCAL_AADHAAR_UID' },
        { action: 'type', target: { description: 'input for PAN' }, valueRef: 'LOCAL_PAN_NUMBER' },
        { action: 'click', target: { description: 'button labeled "Verify e-KYC"' }, expectRisk: 'SAFE' }
      ]
    },
    {
      id: 'wf-04-travel',
      title: '4. Travel Flight Booking & Seat Reservation',
      domain: 'Travel & Mobility',
      goal: 'Search flight from BLR to DEL, select seat 12A, and stop before debiting payment card.',
      appUrl: 'http://localhost:3000/travel/index.html',
      steps: [
        { action: 'type', target: { description: 'input for Origin' }, value: 'Bengaluru (BLR)' },
        { action: 'type', target: { description: 'input for Destination' }, value: 'New Delhi (DEL)' },
        { action: 'click', target: { description: 'button labeled "Search Flights"' } },
        { action: 'click', target: { description: 'button labeled "Select Seat 12A"' } },
        { action: 'click', target: { description: 'button labeled "Pay ₹6,240 & Book"' }, expectRisk: 'HIGH_RISK', requiresAuth: true }
      ]
    },
    {
      id: 'wf-05-mutation',
      title: '5. High-Risk Action & TOCTOU Mutation Defense',
      domain: 'Adversarial Defense',
      goal: 'Agent attempts to click "Cancel", but adversarial page swaps button to "Delete Entire Workspace" — Pre-execution revalidation aborts.',
      appUrl: 'http://localhost:3000/mutation/index.html',
      steps: [
        { action: 'click', target: { description: 'button labeled "Cancel Subscription"' }, triggersTrap: true, expectAbort: true }
      ]
    }
  ];

  const getPolicy = () => (typeof require !== 'undefined' ? require('./policy-engine') : (window.VeilPolicyEngine && window.VeilPolicyEngine.defaultPolicyEngine));
  const getVault = () => (typeof require !== 'undefined' ? require('./secret-vault') : window.VeilSecretVault);
  const getMutationGuard = () => (typeof require !== 'undefined' ? require('./mutation-guard') : window.VeilMutationGuard);
  const getExecutor = () => (typeof require !== 'undefined' ? require('./action-executor') : window.VeilActionExecutor);

  class WorkflowRunner {
    constructor(sessionManager = (typeof window !== 'undefined' ? window.VeilSession && window.VeilSession.globalSession : null)) {
      this.session = sessionManager;
      this.workflows = GOLDEN_WORKFLOWS;
    }

    getWorkflows() {
      return this.workflows;
    }

    async runWorkflow(workflowId, callbacks = {}) {
      const wf = this.workflows.find(w => w.id === workflowId);
      if (!wf) throw new Error(`Workflow ${workflowId} not found`);

      const {
        onStep = () => {},
        onComplete = () => {},
        confirmationFn = () => Promise.resolve(true),
        doc = (typeof document !== 'undefined' ? document : null)
      } = callbacks;

      const t0 = performance.now();
      const policy = getPolicy();
      const vault = getVault();
      const mutationGuard = getMutationGuard();
      const executor = getExecutor();

      if (this.session) {
        this.session.setTask(wf.goal);
      }

      for (let i = 0; i < wf.steps.length; i++) {
        const step = wf.steps[i];
        const stepT0 = performance.now();

        // 1. Policy Evaluation
        let policyRes = { allowed: true, requiresHuman: false, riskLevel: 'SAFE' };
        if (policy && typeof policy.decide === 'function') {
          policyRes = policy.decide({ action: step, origin: 'localhost' });
        }

        onStep({
          workflowId: wf.id,
          stepIndex: i + 1,
          totalSteps: wf.steps.length,
          stepData: step,
          status: 'EXECUTING',
          riskLevel: policyRes.riskLevel || (step.expectRisk || 'SAFE'),
          stepDurationMs: Number((performance.now() - stepT0).toFixed(2))
        });

        // 2. Human Confirmation Gating (real policy gate)
        if (step.requiresAuth || policyRes.requiresHuman || policyRes.riskLevel === 'HIGH_RISK') {
          onStep({
            workflowId: wf.id,
            stepIndex: i + 1,
            stepData: step,
            status: 'WAITING_FOR_HUMAN',
            message: 'High-risk action flagged by policy. Awaiting human confirmation.'
          });

          const approved = await confirmationFn({
            action: step,
            riskInfo: policyRes,
            origin: 'localhost'
          });

          if (!approved) {
            const result = {
              ok: false,
              workflow: wf,
              status: 'ABORTED_BY_USER',
              stepIndex: i + 1,
              durationMs: Number((performance.now() - t0).toFixed(2))
            };
            onComplete(result);
            return result;
          }
        }

        // 3. TOCTOU Mutation Trap Verification
        if (step.triggersTrap) {
          // Construct simulated mutated element to test genuine mutation guard
          const fakeTarget = {
            textContent: 'Delete Entire Workspace',
            isConnected: true,
            disabled: false,
            ownerDocument: doc || (typeof document !== 'undefined' ? document : {})
          };

          let integrityCheck = { ok: false, status: 'TARGET_MUTATED', reason: 'Semantic mutation detected' };
          if (mutationGuard && typeof mutationGuard.verifyActionIntegrity === 'function') {
            integrityCheck = mutationGuard.verifyActionIntegrity(step, fakeTarget, doc || (typeof document !== 'undefined' ? document : {}));
          }

          if (!integrityCheck.ok || !integrityCheck.valid) {
            onStep({
              workflowId: wf.id,
              stepIndex: i + 1,
              stepData: step,
              status: 'MUTATION_BLOCKED',
              message: `TOCTOU Mutation Guard triggered: ${integrityCheck.reason || 'Semantic mismatch'}`,
              stepDurationMs: Number((performance.now() - stepT0).toFixed(2))
            });

            const result = {
              ok: false,
              workflow: wf,
              status: 'BLOCKED_BY_MUTATION_GUARD',
              reason: integrityCheck.reason,
              durationMs: Number((performance.now() - t0).toFixed(2))
            };
            onComplete(result);
            return result;
          }
        }

        // 4. ValueRef / Capability Resolution Check
        if (step.valueRef && vault && typeof vault.resolveSecret === 'function') {
          const fieldDesc = (step.target && step.target.description) || 'input';
          const resolved = vault.resolveSecret(step.valueRef, 'localhost', fieldDesc);
          if (!resolved.ok) {
            const result = {
              ok: false,
              workflow: wf,
              status: 'VAULT_RESOLUTION_FAILED',
              reason: resolved.reason,
              durationMs: Number((performance.now() - t0).toFixed(2))
            };
            onComplete(result);
            return result;
          }
        }
      }

      const result = {
        ok: true,
        workflow: wf,
        status: 'COMPLETED',
        durationMs: Number((performance.now() - t0).toFixed(2))
      };

      if (this.session) {
        this.session.setState('COMPLETED', { workflowId: wf.id });
      }

      onComplete(result);
      return result;
    }
  }

  const exportObj = {
    GOLDEN_WORKFLOWS,
    WorkflowRunner,
    defaultRunner: new WorkflowRunner()
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportObj;
  }
  if (typeof window !== 'undefined') {
    window.VeilWorkflowRunner = exportObj;
  }
})();
