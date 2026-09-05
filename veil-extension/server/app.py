"""
VEIL — server

POST /act receives the sanitized context (structure + labels, no field
values, ever) and a task instruction, and returns a single next action for
the client to resolve and execute locally. The server never sees a pixel
coordinate and never sees a field's actual value -- both are enforced here,
not just assumed of the client.

Security:
  - ElementIn uses extra="forbid" — if a client ever sends a `value` field,
    the request is rejected outright (HTTP 422).
  - Prompt injection guard scans DOM labels for adversarial override patterns
    before the VLM processes them.
  - ValueRef: Remote models can request local secret references (e.g. LOCAL_SECRET_01)
    without ever seeing or receiving raw credentials.
  - Evidence Mode: In VEIL_EVIDENCE_MODE=true, MockVLM is strictly prohibited.
    If Ollama is unavailable, returns HTTP 503 with REAL_REASONER_UNAVAILABLE.
"""

import os
import re
import time
import uuid
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

from vlm_client import (
    ACTION_TYPES,
    MockVLMClient,
    OllamaVLMClient,
    RealReasonerUnavailableError,
    get_vlm_client,
    is_evidence_mode,
    probe_ollama_sync,
)

app = FastAPI(
    docs_url="/docs",
    redoc_url=None,
    title="VEIL server",
    version="0.2.2",
)

# Restrict CORS to Chrome Extension origins and local testing loopbacks (NEVER wildcard "*")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^(chrome-extension://[a-z]{32}|http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?)$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-VEIL-Security-Boundary"],
)


# ---------------------------------------------------------------------------
# Prompt injection guard
# ---------------------------------------------------------------------------

_SUSPECT_MARKERS = re.compile(
    r"(ignore (all|previous|the) instructions|system prompt|you are (now|an) ai|"
    r"disregard (the|your) (task|rules)|act as|reveal (the|all) (secret|password|private))",
    re.IGNORECASE,
)


def _scan_labels_for_injection(elements: list[dict]) -> list[str]:
    """Return any element labels that match injection markers."""
    flagged = []
    for el in elements:
        label = el.get("label", "")
        if isinstance(label, str) and _SUSPECT_MARKERS.search(label):
            flagged.append(label)
    return flagged


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ElementIn(BaseModel):
    # extra="forbid" is deliberate: if a client ever sends a `value` field
    # (a bug, or a misconfigured fork), the request is rejected outright
    # rather than silently accepted with the value ignored.
    model_config = ConfigDict(extra="forbid")

    id: str
    tag: str
    type: Optional[str] = None
    label: str
    sensitive: bool = False


class PageIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    elements: list[ElementIn]


class ActRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    task: str
    page: PageIn
    sessionId: Optional[str] = None
    contextHash: Optional[str] = None


class TargetOut(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Optional[str] = None
    description: Optional[str] = None


class ActResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: str
    target: Optional[TargetOut] = None
    value: Optional[str] = None
    valueRef: Optional[str] = None
    confidence: float = 0.0
    reasoning: str = ""
    telemetry: Optional[dict] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health")
async def health():
    evidence_mode = is_evidence_mode()
    ollama_online, installed_models, detected_model = probe_ollama_sync()
    ollama_endpoint = os.environ.get("VEIL_OLLAMA_URL", "http://localhost:11434")
    target_model = os.environ.get("VEIL_OLLAMA_MODEL", detected_model or "qwen2-vl:7b")

    if evidence_mode:
        reasoner_type = "REAL_OLLAMA" if ollama_online else "REAL_REASONER_UNAVAILABLE"
        reasoner_name = f"Local Ollama Reasoner ({target_model})" if ollama_online else "Offline"
    else:
        reasoner_type = "REAL_OLLAMA" if ollama_online else "DETERMINISTIC_MOCK"
        reasoner_name = f"Local Ollama Reasoner ({target_model})" if ollama_online else "Deterministic Mock Reasoner"

    return {
        "ok": True,
        "evidenceMode": evidence_mode,
        "ollama": {
            "available": ollama_online,
            "endpoint": ollama_endpoint,
            "model": target_model,
            "modelAvailable": bool(target_model in installed_models if installed_models else False),
            "installedModels": installed_models,
        },
        "reasoner": {
            "type": reasoner_type,
            "name": reasoner_name,
        },
        "service": "VEIL Reasoning Gateway",
        "version": "0.2.2",
    }


@app.post("/act", response_model=ActResponse)
async def act(request: ActRequest, raw_request: Request, response: Response):
    t0 = time.perf_counter()
    evidence_mode = is_evidence_mode()

    # --- Security: Request Tracking & Headers ---
    req_id = raw_request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:12]}"
    response.headers["X-Request-ID"] = req_id
    response.headers["X-VEIL-Security-Boundary"] = "ACTIVE"
    response.headers["X-Content-Type-Options"] = "nosniff"

    # --- Security: Optional Gateway Token Authentication ---
    gateway_token = os.environ.get("VEIL_GATEWAY_TOKEN")
    if gateway_token:
        auth_header = raw_request.headers.get("X-VEIL-Session-Key") or raw_request.headers.get("Authorization")
        token_val = auth_header.replace("Bearer ", "").strip() if auth_header else ""
        if token_val != gateway_token:
            raise HTTPException(
                status_code=401,
                detail="Unauthorized: Missing or invalid VEIL gateway authentication token"
            )

    # --- Security: prompt injection guard ---
    elements = [el.model_dump() for el in request.page.elements]
    flagged = _scan_labels_for_injection(elements)
    if flagged:
        raise HTTPException(
            400,
            f"Prompt injection defense triggered: {len(flagged)} label(s) "
            f"contain adversarial override patterns",
        )

    # --- Security: verify no values leaked ---
    for el in elements:
        if "value" in el:
            raise HTTPException(
                400,
                "Privacy violation: client sent a field value. "
                "The server must never receive field values.",
            )

    # --- Reasoner Instantiation & Selection ---
    try:
        client = get_vlm_client()
    except RealReasonerUnavailableError as rrue:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "REAL_REASONER_UNAVAILABLE",
                "reason": rrue.reason,
                "endpoint": rrue.endpoint,
                "model": rrue.model,
                "timestamp": rrue.timestamp,
                "evidenceMode": True,
            },
        )

    active_backend = client.display_name

    # --- Reasoning Execution ---
    try:
        result = await client.decide(request.task, elements)
    except RealReasonerUnavailableError as rrue:
        if evidence_mode:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "REAL_REASONER_UNAVAILABLE",
                    "reason": rrue.reason,
                    "endpoint": rrue.endpoint,
                    "model": rrue.model,
                    "timestamp": rrue.timestamp,
                    "evidenceMode": True,
                },
            )
        # In non-evidence development mode, provide fallback with clear telemetry
        active_backend = "Deterministic Mock Reasoner (Fallback: Ollama Unreachable)"
        mock_client = MockVLMClient()
        result = await mock_client.decide(request.task, elements)
    except Exception as exc:
        if evidence_mode:
            raise HTTPException(502, f"Real reasoner execution failure: {exc}") from exc
        active_backend = f"Deterministic Mock Reasoner (Fallback: {exc})"
        mock_client = MockVLMClient()
        result = await mock_client.decide(request.task, elements)

    # --- Model-Output Security Firewall ---
    action_type = result.get("action")
    if action_type not in ACTION_TYPES:
        raise HTTPException(
            502, f"VLM backend returned an invalid action: {action_type!r}"
        )

    # Reject dangerous code execution or XPath expressions in target id
    target_data = result.get("target")
    if isinstance(target_data, dict) and target_data.get("id"):
        tid = str(target_data["id"])
        if re.search(r"[<>\(\)\{\};]", tid) or tid.startswith("//"):
            raise HTTPException(
                502, f"Model-output firewall rejected unsafe target expression: {tid!r}"
            )

    # Inspect value for javascript: / script injection and credential echoes
    val_data = result.get("value")
    if val_data and isinstance(val_data, str):
        if re.search(r"^\s*javascript:", val_data, re.IGNORECASE) or "<script" in val_data.lower():
            raise HTTPException(
                502, "Model-output firewall rejected script injection in action value."
            )
        if re.search(r"\b(?:\d[ -]?){13,19}\b", val_data):
            raise HTTPException(
                502, "Model-output firewall rejected raw card number in proposed action value."
            )

    elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
    telemetry_data = {
        "requestId": req_id,
        "serverLatencyMs": elapsed_ms,
        "activeBackend": active_backend,
        "evidenceMode": evidence_mode,
        "securityVerification": "PASSED",
        "injectionLabelsBlocked": 0,
    }
    if "_telemetry" in result:
        telemetry_data.update(result.pop("_telemetry"))

    # Construct strictly validated ActResponse
    safe_target = None
    if isinstance(target_data, dict):
        safe_target = TargetOut(
            id=target_data.get("id"),
            description=target_data.get("description")
        )

    return ActResponse(
        action=action_type,
        target=safe_target,
        value=result.get("value"),
        valueRef=result.get("valueRef"),
        confidence=float(result.get("confidence") or 0.0),
        reasoning=str(result.get("reasoning") or ""),
        telemetry=telemetry_data,
    )


@app.get("/")
async def root():
    return {
        "message": "VEIL Reasoning Gateway is active. Extension targets POST /act.",
        "docs": "/docs",
    }
