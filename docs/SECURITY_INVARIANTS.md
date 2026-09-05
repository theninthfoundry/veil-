# VEIL — Formal Security Invariants

**Standard**: Formal Systems Security Specification  
**Authority**: VEIL Local Security Kernel  
**Date**: September 2, 2026  

---

## 1. Primary Security Invariant

$$\boxed{\mathcal{I}_1: \quad \forall t \in \text{Time}, \quad \text{ModelAccess}(\text{SecretValues}) = \emptyset \quad \land \quad \text{ModelAuthority}(\text{BrowserExecution}) = \emptyset}$$

> **"The reasoning model can observe sanitized context and propose actions, but it can never directly access protected values or directly control the browser."**

### Corollaries:
1. $\mathcal{I}_{1.1}$ (**No Egress of Unmasked Values**): No outbound network request sent to the reasoning gateway or third-party host may contain the `.value` property or raw plaintext representation of any detected sensitive entity.
2. $\mathcal{I}_{1.2}$ (**No Model Execution Authority**): An action proposal emitted by the model is advisory. It does not possess authority to execute without passing local schema validation, policy authorization, target revalidation, and human confirmation if high-risk.

---

## 2. Invariant Taxonomy

### Invariant 2: The Egress Invariant (Fail-Closed DLP)
$$\mathcal{I}_2: \quad \text{Payload}_{\text{outbound}} \cap (\text{PII}_{\text{detected}} \cup \text{CanaryTokens} \cup \text{VaultSecrets}) = \emptyset$$
Before any serialized payload is dispatched via `background.js`, it must pass through the Pre-Flight Privacy Firewall. If any Canary Token, Luhn-valid credit card number, or unmasked form value is detected, the transport layer must immediately abort transmission with status `BLOCKED_BEFORE_DISPATCH`.

### Invariant 3: The DOM Privacy Invariant (Zero Domestic Leakage)
$$\mathcal{I}_3: \quad \text{DOM}_{\text{webpage}} \cap \text{Secrets}_{\text{VEIL}} = \emptyset$$
VEIL shall never mirror, interpolate, or store unmasked sensitive values inside the webpage's DOM. Specifically:
- No `data-veil-reveal` or custom attributes storing secret plaintext.
- No CSS pseudo-elements displaying sensitive text.
- No `innerHTML` interpolation of user credentials.
Unmasked values are held exclusively in volatile memory within isolated extension JavaScript scopes and zeroed after use.

### Invariant 4: The Authority Invariant (Extension-Owned Governance)
$$\mathcal{I}_4: \quad \text{ApprovalAuthority}(\text{WebpageDOM}) = \emptyset$$
High-risk authorization decisions (monetary payments, fund transfers, account deletions) shall never be rendered or solicited within the target webpage's DOM. All authoritative confirmation UI must reside in extension-owned surfaces (Chrome Side Panel, Extension Popup, or dedicated Extension Page) bound to:
$$\text{ApprovalRecord} = \{\text{sessionId}, \text{actionId}, \text{origin}, \text{targetFingerprint}, \text{contextHash}, \text{expiresAt}\}$$

### Invariant 5: The TOCTOU Mutation Invariant (Target Attestation)
$$\mathcal{I}_5: \quad \text{Fingerprint}(T_{\text{execution}}) = \text{Fingerprint}(T_{\text{proposal}}) \quad \land \quad \text{Overlap}(T_{\text{execution}}, T_{\text{proposal}}) \ge 0.30$$
Before physical dispatch of any synthetic DOM event, the runtime must re-resolve the target element on the live DOM and calculate its multi-attribute fingerprint. If the element is disconnected, disabled, replaced, or semantically mutated (e.g. price swap from ₹4,999 to ₹50,000), execution is aborted immediately with `TARGET_MUTATED`.

### Invariant 6: The Capability Invariant (Single-Use Ephemeral Tokens)
$$\mathcal{I}_6: \quad \text{Capability}(\text{Secret}) \implies \text{SingleUse} \land \text{Expiring} \land \text{OriginBound} \land \text{FieldBound}$$
Credentials stored in the Local Secret Vault are never referenced by plaintext or permanent handles. A request for a secret yields an ephemeral Capability token valid only for a specific origin, target field, and single action dispatch. Upon resolution, the token is permanently burned.

### Invariant 7: The Sensor Fusion Invariant (Visual/DOM Disagreement Gate)
$$\mathcal{I}_7: \quad \text{Disagreement}(\text{Text}_{\text{DOM}}, \text{Text}_{\text{OCR}}) \implies \text{Status} = \text{BLOCKED\_REPERCEIVE}$$
When an interactive target contains both DOM text and rendered raster pixels, visual OCR and DOM perception must reach semantic agreement. If DOM text contradicts visual pixels, VEIL halts execution and demands user review.

---

## 3. Enforcement Verification Table

| Invariant | Description | Enforcing Component | Verification Test |
|---|---|---|---|
| $\mathcal{I}_1$ | Core Isolation Invariant | `core/agent-orchestrator.js` | `benchmark/test-security-invariant.js` |
| $\mathcal{I}_2$ | Outbound Egress DLP | `core/privacy-audit.js`, `core/network-forensics.js` | `benchmark/run-network-forensics.js` |
| $\mathcal{I}_3$ | Zero DOM Secret Leakage | `content/redactor.js` | `benchmark/run-vision-test.js` |
| $\mathcal{I}_4$ | Extension-Owned Approval | `content/high-risk-confirmation.js`, `sidepanel/` | `benchmark/run-confirmation-fsm-test.js` |
| $\mathcal{I}_5$ | TOCTOU Target Attestation | `core/mutation-guard.js` | `benchmark/run-confirmation-fsm-test.js` |
| $\mathcal{I}_6$ | Ephemeral Capabilities | `core/secret-vault.js` | `benchmark/run-formal-certification.js` |
| $\mathcal{I}_7$ | Sensor Fusion Agreement | `core/visual-ocr.js`, `core/perception/fusion.js` | `benchmark/run-real-ocr-test.js` |
