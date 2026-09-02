# VEIL — Security Test Validation & Negative Test Audit

**Auditor**: Independent Forensic Verification Authority  
**Date**: September 2, 2026

---

## 1. Negative Test Verification Methodology

A security test is valid **only if it fails when the underlying defense is disabled or bypassed**.
We evaluated the primary defense gates by verifying their failure behavior under negative conditions:

---

## 2. Gate-by-Gate Negative Test Proofs

### Gate 1: Pydantic Schema `extra="forbid"` Defense
- **Production Defense**: [`server/app.py`](file:///d:/veil/veil-extension/server/app.py#L87) `model_config = ConfigDict(extra="forbid")` on `ElementIn`.
- **Negative Test**: Send payload containing `{"id": "card", "tag": "input", "label": "Card", "sensitive": true, "value": "4111222233334444"}`.
- **Result with Defense**: **HTTP 422 Unprocessable Entity** (Test passes).
- **Hypothetical Failure if Defense Removed (`extra="allow"`)**: Payload would be accepted with HTTP 200, exposing a leak vulnerability. The test strictly validates the defense.

### Gate 2: Local Secret Vault Origin Whitelist
- **Production Defense**: [`core/secret-vault.js`](file:///d:/veil/veil-extension/core/secret-vault.js) `isOriginAllowed(origin, secret)`.
- **Negative Test**: Request secret resolution on origin `https://phishing-site.ru`.
- **Result with Defense**: Returns `null` (Test passes).
- **Hypothetical Failure if Defense Removed**: Raw secret would be returned to untrusted script.

### Gate 3: Mutation Guard Semantic Overlap Threshold
- **Production Defense**: [`core/mutation-guard.js`](file:///d:/veil/veil-extension/core/mutation-guard.js) `wordOverlapScore(expected, live) < 0.25 -> MUTATION_DETECTED`.
- **Negative Test**: Swap button label from `"Cancel"` to `"Delete Entire Workspace"`.
- **Result with Defense**: Returns `{ valid: false, status: 'MUTATION_DETECTED' }` (Test passes).
- **Hypothetical Failure if Defense Removed**: Agent would execute click on the dangerous mutated button.

### Gate 4: Pre-Flight Canary Regex Filter
- **Production Defense**: [`core/network-forensics.js`](file:///d:/veil/veil-extension/core/network-forensics.js) `inspectOutboundRequest()`.
- **Negative Test**: Inject `VEIL_CANARY_SECRET` into task prompt.
- **Result with Defense**: Returns `{ verdict: 'BLOCKED' }` (Test passes).
