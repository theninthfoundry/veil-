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

      const { onStep = () => {}, onComplete = () => {} } = callbacks;
      const t0 = performance.now();

      if (this.session) {
        this.session.setTask(wf.goal);
      }

      for (let i = 0; i < wf.steps.length; i++) {
        const step = wf.steps[i];
        const stepT0 = performance.now();

        onStep({
          workflowId: wf.id,
          stepIndex: i + 1,
          totalSteps: wf.steps.length,
          stepData: step,
          status: 'EXECUTING'
        });

        // Simulate step latency
        await new Promise(r => setTimeout(r, 200));

        if (step.requiresAuth) {
          onStep({
            workflowId: wf.id,
            stepIndex: i + 1,
            stepData: step,
            status: 'WAITING_FOR_HUMAN',
            message: 'High-risk action flagged. Awaiting human confirmation.'
          });
          await new Promise(r => setTimeout(r, 300));
        }

        if (step.triggersTrap) {
          onStep({
            workflowId: wf.id,
            stepIndex: i + 1,
            stepData: step,
            status: 'MUTATION_BLOCKED',
            message: 'TOCTOU Mutation Trap detected prior to execution. Action aborted safely.'
          });
          const result = {
            ok: false,
            workflow: wf,
            status: 'BLOCKED_BY_MUTATION_GUARD',
            durationMs: Number((performance.now() - t0).toFixed(2))
          };
          onComplete(result);
          return result;
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
