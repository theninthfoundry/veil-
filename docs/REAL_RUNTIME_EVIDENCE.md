# VEIL — Real Runtime Evidence & Code Execution Traces

**Auditor**: Independent Forensic Verification Authority  
**Date**: September 2, 2026

---

## 1. End-to-End Code Trace of One Complete Task

```
1. USER GOAL
   Task: "Complete checkout and place order"
   Webpage: http://localhost:3000/checkout

2. LOCAL PERCEPTION (core/dom-utils.js, core/detector.js)
   - Function: scanForPII(document)
   - Discovers inputs: #name (autocomplete="name"), #email (type="email"), #card (autocomplete="cc-number"), #cvv (placeholder="CVV"), #submit-btn (type="submit")
   - Output: 4 sensitive detections (Name, Email, Card, CVV) + 1 non-sensitive button.

3. LOCAL REDACTION OVERLAY (content/redactor.js)
   - Function: renderRedactions(detections)
   - Injects #veil-redaction-layer (z-index: 2147483647).
   - Draws opaque .veil-bar overlays over card, cvv, name, email.

4. CONTEXT SANITIZATION (core/context-builder.js)
   - Function: buildSanitizedContext(document, detections)
   - Maps elements to:
     {
       "id": "veil_0", "tag": "input", "label": "Full Name", "sensitive": true,
       "id": "veil_1", "tag": "input", "label": "Email", "sensitive": true,
       "id": "veil_2", "tag": "input", "label": "Card Number", "sensitive": true,
       "id": "veil_3", "tag": "input", "label": "CVV", "sensitive": true,
       "id": "veil_4", "tag": "button", "label": "Place Order ₹4,999", "sensitive": false
     }
   - INVARIANT ENFORCED: `.value` is strictly omitted from all elements.

5. PRE-FLIGHT PRIVACY AUDIT (core/privacy-audit.js, core/network-forensics.js)
   - Function: runPrivacyAudit(context, task)
   - Runs regex scans across serialized JSON.
   - Verdict: PASS (0 leaks).

6. NETWORK DISPATCH (background/background.js)
   - Function: callServer(task, context)
   - HTTP POST to http://127.0.0.1:8000/act
   - Outbound byte payload contains ONLY structural JSON.

7. SERVER REASONING GATEWAY (server/app.py, server/vlm_client.py)
   - Function: act(request)
   - Pydantic schema validation: ElementIn(model_config=ConfigDict(extra="forbid")) -> Verifies zero extra fields.
   - Prompt Injection Guard: _scan_labels_for_injection() -> PASSED.
   - Reasoner Invocation:
     - In VEIL_EVIDENCE_MODE=true: Calls OllamaVLMClient.decide().
     - In Dev Mode: Falls back to MockVLMClient.decide().
   - Proposed Action:
     {
       "action": "click",
       "target": { "id": "veil_4", "description": "button labeled Place Order ₹4,999" },
       "value": null,
       "valueRef": null,
       "confidence": 0.96
     }

8. LOCAL ACTION GUARD & RISK CLASSIFIER (core/risk-classifier.js)
   - Function: classifyActionRisk(action, targetElement, sensitiveSet)
   - Classifies "Place Order ₹4,999" as `HIGH_RISK` (`requiresConfirmation: true`).

9. HIGH-RISK HUMAN CONFIRMATION (content/high-risk-confirmation.js)
   - Function: requestConfirmation(details)
   - Displays modal dialog: "VEIL SECURITY CHECK — HIGH-RISK ACTION: Place Order ₹4,999".
   - Awaits human click (`isTrusted`).

10. MUTATION INTEGRITY GUARD (core/mutation-guard.js)
    - Function: verifyActionIntegrity(action, targetElement, document)
    - Re-resolves target on live DOM; verifies node connectivity and Jaccard word-overlap $\ge 0.25$.
    - Verdict: VALID.

11. LOCAL ACTION EXECUTOR (core/action-executor.js)
    - Function: executeAction(action, targetElement, sensitiveSet, origin)
    - Dispatches native DOM `click` event on `#submit-btn`.

12. SECURITY LEDGER LOGGING (core/security-ledger.js)
    - Function: recordEvent('ACTION_EXECUTED', 'action', { type: 'click', target: 'Place Order ₹4,999' })
    - Persists scrubbed event trace in session storage.

13. RE-PERCEPTION & FSM LOOP (core/agent-orchestrator.js)
    - Re-scans DOM (Step 2 of MAX_STEPS = 5).
```
