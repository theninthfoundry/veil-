"""
VEIL — server

POST /act receives the sanitized context (structure + labels, no field
values, ever) and a task instruction, and returns a single next action for
the client to resolve and execute locally. The server never sees a pixel
coordinate and never sees a field's actual value -- both are enforced here,
not just assumed of the client.

Security:
  - ElementIn uses extra="forbid" — if a client ever sends a `value` field,
    the request is rejected outright.
  - Prompt injection guard scans DOM labels for adversarial override patterns
    before the VLM processes them.
  - ValueRef: Remote models can request local secret references (e.g. LOCAL_SECRET_01)
    without ever seeing or receiving raw credentials.
"""

import re
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

from vlm_client import ACTION_TYPES, get_vlm_client

app = FastAPI(
    docs_url='/docs',
    redoc_url=None,title="VEIL server", version="0.2.0")

# CORS for Chrome Extension requests (content script / service worker origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Prompt injection guard (merged from server/app/security/)
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
    client = get_vlm_client()
    return {
        "ok": True,
        "backend": client.backend_name,
        "service": "VEIL Reasoning Gateway",
        "version": "0.2.0",
    }


@app.post("/act", response_model=ActResponse)
async def act(request: ActRequest):
    import time

    t0 = time.perf_counter()

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

    # --- Reasoning ---
    client = get_vlm_client()
    try:
        result = await client.decide(request.task, elements)
    except Exception as exc:
        raise HTTPException(502, f"VLM backend error: {exc}") from exc

    if result.get("action") not in ACTION_TYPES:
        raise HTTPException(
            502, f"VLM backend returned an invalid action: {result.get('action')!r}"
        )

    elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

    return ActResponse(
        **result,
        telemetry={
            "serverLatencyMs": elapsed_ms,
            "activeBackend": client.backend_name,
            "securityVerification": "PASSED",
            "injectionLabelsBlocked": 0,
        },
    )


@app.get("/")
async def root():
    return {
        "message": "VEIL Reasoning Gateway is active. Extension targets POST /act.",
        "docs": "/docs",
    }
