# VEIL — Formal Threat Model & Adversarial Matrix

**Standard**: STRIDE Threat Analysis & Defense-in-Depth Specification  
**Authority**: VEIL Local Security Kernel  
**Date**: September 2, 2026  

---

## 1. Threat Actors & Capabilities

| Threat Actor | Access Level | Objectives | Capabilities |
|---|---|---|---|
| **Hostile Webpage Operator** | Complete control over webpage DOM, CSS, scripts, and network endpoints | Exfiltrate user credentials, hijack agent actions, induce unwanted financial transfers | DOM mutation traps, invisible elements, clickjacking, prompt injection in DOM text, fake buttons |
| **Compromised Reasoning Model** | Receives sanitized context, generates action proposals | Exfiltrate secrets via proposal fields, execute arbitrary scripts, bypass user authorization | Emitting malicious URLs, coordinate guessing, hallucinating approvals, generating XSS/injection payloads |
| **Local Malicious Process** | Unprivileged local software on the host OS | Eavesdrop on agent gateway, inject commands into FastAPI server | Port scanning localhost:8000, sending forged `/act` HTTP requests |
| **Network Eavesdropper** | Observes unencrypted transit (if any) | Steal credentials and sensitive PII in transit | Sniffing outbound HTTP requests |

---

## 2. STRIDE Threat Analysis & VEIL Countermeasures

### 1. Spoofing (Identity & Authority)
- **Threat**: Webpage injects fake modal or spoofed approval dialog to trick user into confirming a hostile wire transfer.
- **VEIL Defense**: Authorization UI is moved completely out of the webpage DOM into an extension-owned surface (Side Panel / Popup). Webpage scripts cannot touch or style the approval gate.
- **Threat**: Malicious local process sends forged `/act` requests to FastAPI gateway.
- **VEIL Defense**: Gateway requires an installation-bound bearer token handshake (`X-VEIL-Session-Key`) generated during extension initialization.

### 2. Tampering (Data & Targets)
- **Threat (TOCTOU)**: User approves "Place Order ₹4,999". Webpage dynamically mutates the button to "Place Order ₹49,999" before click execution.
- **VEIL Defense**: Pre-execution Mutation Guard re-resolves target, recalculates multi-attribute cryptographic fingerprint, and compares Jaccard overlap. If digits or label changed, execution is aborted with `TARGET_MUTATED`.

### 3. Repudiation (Audit Trail Integrity)
- **Threat**: Attacker or compromised model alters or erases past action logs to hide exfiltration attempts.
- **VEIL Defense**: Cryptographic event ledger links records in a tamper-evident hash chain: `event[i].prevHash = hash(event[i-1])`.

### 4. Information Disclosure (PII & Secret Exfiltration)
- **Threat**: Model attempts to output or request user password in context.
- **VEIL Defense**: Model never receives raw passwords. Passwords exist only in memory-isolated Vault and are resolved via single-use, origin-bound Capability tokens. Pre-flight Privacy Firewall blocks any outbound payload containing raw values or canary tokens.
- **Threat (Redaction Leakage)**: Webpage inspects redaction overlay attributes to steal masked data.
- **VEIL Defense**: Redaction overlays (`.veil-bar`) contain zero plaintext values. All hover reveal state is stored in an in-memory WeakMap inside the isolated content script.

### 5. Denial of Service / Resource Exhaustion
- **Threat**: Hostile webpage floods the DOM with 50,000 nodes or infinite recursive mutations to freeze the agent perception loop.
- **VEIL Defense**: DOM traversal enforces depth and element limits (max 1,000 elements), debounced mutation observation (300ms), and execution step/duration budgets.

### 6. Elevation of Privilege (Action Hijacking)
- **Threat**: Model emits `action: "EXECUTE_JS"` or `javascript:...` URI to gain code execution in the browser.
- **VEIL Defense**: Strict Model Output Firewall validates action schemas against strict whitelist (`CLICK`, `TYPE`, `SELECT`, `SCROLL`, `WAIT`, `NAVIGATE`, `FINISH`). Arbitrary selectors, XPath, coordinates, and script URIs are rejected before policy evaluation.
