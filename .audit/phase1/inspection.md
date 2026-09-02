# Phase 1 Forensic Inspection Notes: Reasoning Path & Trust Boundaries

**Date**: September 2, 2026  
**Auditor**: Forensic Assessment Engine  
**Objective**: Trace request origination, serialization, transport, reasoner selection, Ollama contract, and local action dispatch.

---

## 1. Request Origination & Data Flow Trace
1. **Perception**: Content script (`content/content.js`) runs `scanForPII()` and `buildSanitizedContext(document, detections)`.
2. **Context Serialization**: `context-builder.js` emits structural JSON with `{ elements: [...] }`, `id`, `tag`, `type`, `label`, `sensitive` (boolean). **Omission of `.value` is structural**.
3. **Pre-Flight Audit**: `privacy-audit.js` scans the serialized JSON payload and user task text with regexes before dispatch.
4. **Transport**:
   - `content.js` calls `chrome.runtime.sendMessage({ type: 'SEND_TO_SERVER', ... })`.
   - `background.js` issues `fetch('http://localhost:8000/act', { method: 'POST', body: JSON.stringify(payload) })`.
5. **FastAPI Gateway** (`server/app.py`):
   - Inbound JSON parsed by Pydantic `ActRequest` -> `PageIn` -> `ElementIn`.
   - `ElementIn` has `model_config = ConfigDict(extra="forbid")`. If a client sends `"value"`, FastAPI returns HTTP 422 immediately.
   - `_scan_labels_for_injection()` scans all element labels for prompt injection patterns. Returns HTTP 400 if hostile markers are detected.
6. **Reasoner Selection** (`server/vlm_client.py`):
   - Currently, `get_vlm_client()` checks `VEIL_VLM_BACKEND` (auto / ollama / mock).
   - In standard mode, it attempts to probe Ollama and falls back to `MockVLMClient`.
   - **Crucial Phase 1 Gap**: In `VEIL_EVIDENCE_MODE=true`, **Mock fallback must be completely forbidden**. If Ollama is offline or model is missing, it must return `HTTP 503 / REAL_REASONER_UNAVAILABLE` with complete diagnostic telemetry.
7. **Action Contract & Local Dispatch**:
   - Model returns structured semantic action: `{ "action": "click|type|scroll|wait|finish|none", "target": { "id": "...", "description": "..." }, "value": "...", "valueRef": "LOCAL_SECRET_01", "confidence": float, "reasoning": "..." }`.
   - Content script passes proposal to `core/action-resolver.js` (Jaccard fuzzy matching on live DOM).
   - `core/risk-classifier.js` validates action risk (`SAFE`, `SENSITIVE`, `HIGH_RISK`, `BLOCKED`).
   - If `valueRef` is requested, `core/secret-vault.js` resolves the real secret strictly on-device against origin and field whitelists.
   - `core/action-executor.js` dispatches native DOM events (`focus`, `input`, `change`, `click`).
   - Mandatory re-perception occurs via `agent-orchestrator.js`.

---

## 2. Evidence Mode Requirements for Phase 1
1. `VEIL_EVIDENCE_MODE=true` environment variable enforcement:
   - Forbids any instantiation or invocation of `MockVLMClient`.
   - Requires real reachable Ollama endpoint (`http://localhost:11434`).
   - Rejects mock substitution; logs exact connection state, error, and timestamp on failure.
2. Distinct UI & Health Telemetry:
   - `GET /health` must expose exact reasoner type (`"REAL_OLLAMA"` vs `"DETERMINISTIC_MOCK"`), Ollama endpoint, detected models, and evidence mode state.
3. Second Independent Serialization Assertion:
   - Explicitly verify `JSON.stringify(outbound_request)` before sending to Ollama.
4. Canary Secret Non-Leakage Assertion:
   - Seed `VEIL_CANARY_SECRET_DO_NOT_LEAK` into vault; verify zero occurrences in server logs, prompts, or outbound network bytes.
