# VEIL — Phase A: Real Ollama Reasoning & Evidence Specification

**Document Date**: September 2, 2026  
**Auditor**: Forensic Verification & Safety Authority  
**Status**: VERIFIED & FROZEN FOR PHASE A

---

## 1. Real Reasoner Contract & Evidence Mode Specification

In standard operational mode, VEIL auto-probes the local Ollama instance on `http://localhost:11434/api/tags`.
In strict evidence mode (`VEIL_EVIDENCE_MODE=true`):
1. **MockVLMClient is Strictly Prohibited**: The reasoner will never silently substitute simulated or rule-based mock responses.
2. **Fail-Closed Guarantee**: If Ollama is unreachable, offline, or lacks the configured model, the backend immediately halts and raises `RealReasonerUnavailableError` with HTTP 503 (`REAL_REASONER_UNAVAILABLE`).
3. **Telemetry Transparency**: The `/health` endpoint and response payload truthfully expose `type: "REAL_OLLAMA"` or `"REAL_REASONER_UNAVAILABLE"`.

---

## 2. Invariant & Security Assertion Matrix

| Security & Privacy Invariant | Test Method | Expected Behavior | Verification Status |
|---|---|---|---|
| **Fail-Closed Offline Defense** | Non-existent port (`127.0.0.1:59999`) | Returns HTTP 503 `REAL_REASONER_UNAVAILABLE` | **PASS (Verified)** |
| **Canary Secret Egress Guard** | Injects `VEIL_CANARY_SECRET_DO_NOT_LEAK` | Raises `ValueError` prior to socket dispatch | **PASS (Verified)** |
| **Raw Value Ingress Guard** | Injects `"value": "4111..."` in payload | Pydantic `extra="forbid"` rejects with HTTP 422 | **PASS (Verified)** |
| **Coordinate Injection Defense** | Injects `{"x": 450, "y": 820}` in model target | Rejects with `COORDINATE_INJECTION_BLOCKED` | **PASS (Verified)** |
| **Malicious Script Defense** | Injects `{"script": "window.location=..."}` | Rejects with `MALICIOUS_FIELD_BLOCKED` | **PASS (Verified)** |
| **Raw Secret Output Defense** | Model outputs `4111 1111...` in value | Rejects with `RAW_SECRET_OUTPUT_BLOCKED` | **PASS (Verified)** |
| **Strict Schema Enforcement** | Model returns unknown JSON keys | Rejects with `SCHEMA_VIOLATION_BLOCKED` | **PASS (Verified)** |
| **Prompt Injection Defense** | Adversarial override label in DOM | Backend rejects with HTTP 400 | **PASS (Verified)** |

---

## 3. Real Ollama Prompt & Sanitized Context Interface

The model prompt enforces a structured JSON response and explicitly requires ValueRef references:

```json
{
  "action": "type",
  "target": {
    "id": "card-number-input",
    "description": "input labeled Card Number"
  },
  "value": null,
  "valueRef": "LOCAL_SECRET_01",
  "confidence": 0.95,
  "reasoning": "Inject local secret reference 'LOCAL_SECRET_01' (Demo Card) without exposing raw data."
}
```

Raw secret values are never transmitted to the model and are never output by the model. All resolution takes place on-device inside `core/secret-vault.js`.
