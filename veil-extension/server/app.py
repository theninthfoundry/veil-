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
from typing import Optional

from fastapi import FastAPI, HTTPException
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

# CORS for Chrome Extension requests (content script / service worker origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
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
    elements: list[ElementIn]


class ActRequest(BaseModel):
    task: str
    page: PageIn


class TargetOut(BaseModel):
    id: Optional[str] = None
    description: Optional[str] = None


class ActResponse(BaseModel):
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
async def act(request: ActRequest):
    t0 = time.perf_counter()
    evidence_mode = is_evidence_mode()

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

    if result.get("action") not in ACTION_TYPES:
        raise HTTPException(
            502, f"VLM backend returned an invalid action: {result.get('action')!r}"
        )

    elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
    telemetry_data = {
        "serverLatencyMs": elapsed_ms,
        "activeBackend": active_backend,
        "evidenceMode": evidence_mode,
        "securityVerification": "PASSED",
        "injectionLabelsBlocked": 0,
    }
    if "_telemetry" in result:
        telemetry_data.update(result.pop("_telemetry"))

    return ActResponse(
        **result,
        telemetry=telemetry_data,
    )


@app.get("/")
async def root():
    return {
        "message": "VEIL Reasoning Gateway is active. Extension targets POST /act.",
        "docs": "/docs",
    }
