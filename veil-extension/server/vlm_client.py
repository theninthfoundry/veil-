"""
VEIL -- VLM client abstraction with Local Secret ValueRef Support & Strict Evidence Mode.

Two backends behind one unified interface:
  - MockVLMClient: deterministic rule-based reasoner supporting ValueRef actions
    (e.g. LOCAL_SECRET_01 for card, LOCAL_SECRET_03 for address) and button clicks.
  - OllamaVLMClient: calls a local Ollama server (Qwen2-VL, Llama3.2-Vision, Llama3.2).

In VEIL_EVIDENCE_MODE=true:
  - MockVLMClient is strictly PROHIBITED.
  - If Ollama is offline or requested model is missing, raises RealReasonerUnavailableError.
  - No fallback, no simulated actions, zero synthetic substitution.
"""

import json
import os
import re
import time
from typing import Optional, Tuple

import httpx

ACTION_TYPES = {"click", "type", "scroll", "wait", "none", "finish"}

COMMIT_WORDS = {"buy", "purchase", "checkout", "complete", "order", "submit", "confirm", "pay", "place"}

CANARY_SECRET = "VEIL_CANARY_SECRET_DO_NOT_LEAK"


class RealReasonerUnavailableError(Exception):
    """Raised in evidence mode when real local Ollama is offline or model is missing."""

    def __init__(self, reason: str, endpoint: str, model: str):
        super().__init__(f"REAL_REASONER_UNAVAILABLE: {reason} (endpoint: {endpoint}, model: {model})")
        self.reason = reason
        self.endpoint = endpoint
        self.model = model
        self.timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _words(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", (text or "").lower()))


def _find_best_button(task: str, elements: list[dict]) -> Optional[dict]:
    task_words = _words(task)
    best = None
    best_score = 0
    for el in elements:
        if el.get("tag") not in ["button", "a"] and el.get("type") != "submit":
            continue
        overlap = len(_words(el.get("label", "")) & (task_words | COMMIT_WORDS))
        if overlap > best_score:
            best_score = overlap
            best = el
    return best


class MockVLMClient:
    """Rule-based stand-in for a real VLM with Local Secret Reference planning."""

    backend_name = "mock"
    display_name = "Deterministic Mock Reasoner"

    async def decide(self, task: str, elements: list[dict]) -> dict:
        task_lower = task.lower()

        # Check for unfilled sensitive fields that match local secret vault references
        for el in elements:
            label = el.get("label", "").lower()
            tag = el.get("tag", "").lower()

            if tag not in ["input", "textarea"]:
                continue

            if ("card" in label or "cc" in label) and "submit" not in label:
                return {
                    "action": "type",
                    "target": {"id": el["id"], "description": f"{el['tag']} labeled {el['label']}"},
                    "value": None,
                    "valueRef": "LOCAL_SECRET_01",
                    "confidence": 0.95,
                    "reasoning": f"Inject local secret reference 'LOCAL_SECRET_01' (Demo Card) into '{el['label']}' without exposing raw data.",
                }

            if "cvv" in label or "cvc" in label or "security code" in label:
                return {
                    "action": "type",
                    "target": {"id": el["id"], "description": f"{el['tag']} labeled {el['label']}"},
                    "value": None,
                    "valueRef": "LOCAL_SECRET_02",
                    "confidence": 0.95,
                    "reasoning": f"Inject local secret reference 'LOCAL_SECRET_02' (Demo CVV) into '{el['label']}'.",
                }

            if "address" in label or "street" in label:
                return {
                    "action": "type",
                    "target": {"id": el["id"], "description": f"{el['tag']} labeled {el['label']}"},
                    "value": None,
                    "valueRef": "LOCAL_SECRET_03",
                    "confidence": 0.92,
                    "reasoning": f"Inject local secret reference 'LOCAL_SECRET_03' (Shipping Address) into '{el['label']}'.",
                }

            if "phone" in label or "mobile" in label or "contact" in label:
                return {
                    "action": "type",
                    "target": {"id": el["id"], "description": f"{el['tag']} labeled {el['label']}"},
                    "value": None,
                    "valueRef": "LOCAL_SECRET_04",
                    "confidence": 0.90,
                    "reasoning": f"Inject local secret reference 'LOCAL_SECRET_04' (Contact Phone) into '{el['label']}'.",
                }

            if "name" in label and "submit" not in label and "button" not in tag:
                return {
                    "action": "type",
                    "target": {"id": el["id"], "description": f"{el['tag']} labeled {el['label']}"},
                    "value": None,
                    "valueRef": "LOCAL_SECRET_05",
                    "confidence": 0.91,
                    "reasoning": f"Inject local secret reference 'LOCAL_SECRET_05' (User Name) into '{el['label']}'.",
                }

        target_el = _find_best_button(task, elements)
        if target_el is not None:
            return {
                "action": "click",
                "target": {"id": target_el["id"], "description": f"{target_el['tag']} labeled {target_el['label']}"},
                "value": None,
                "valueRef": None,
                "confidence": 0.96,
                "reasoning": f"Task implies checkout completion; click matching primary control '{target_el['label']}'.",
            }

        return {
            "action": "finish",
            "target": None,
            "value": None,
            "valueRef": None,
            "confidence": 1.0,
            "reasoning": "No further actionable controls required; goal completed.",
        }


class OllamaVLMClient:
    """Calls a local Ollama server supporting ValueRef references with strict boundary validation."""

    backend_name = "ollama"
    display_name = "Local Ollama Reasoner"

    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None, timeout: float = 15.0):
        self.base_url = (base_url or os.environ.get("VEIL_OLLAMA_URL", "http://localhost:11434")).rstrip("/")
        self.model = model or os.environ.get("VEIL_OLLAMA_MODEL", "qwen2-vl:7b")
        self.timeout = float(os.environ.get("VEIL_OLLAMA_TIMEOUT", timeout))

    def _build_prompt(self, task: str, elements: list[dict]) -> str:
        return (
            "You are a privacy-preserving web agent reasoner.\n"
            "You control a web page through a fixed set of interactive elements.\n"
            "You never see raw field values, only element tags and semantic labels.\n"
            "For sensitive fields (card, address, name, phone, password), you MUST specify 'valueRef': 'LOCAL_SECRET_01' "
            "instead of raw values. Raw secret values must NEVER be output or requested.\n\n"
            f"User Task: {task}\n\n"
            f"Available Elements (JSON): {json.dumps(elements)}\n\n"
            "Respond with ONLY a valid JSON object matching exactly this schema, with no surrounding text or markdown formatting:\n"
            "{\n"
            '  "action": "click" | "type" | "scroll" | "wait" | "finish" | "none",\n'
            '  "target": {"id": "<element id from elements list or null>", "description": "<short description>"} or null,\n'
            '  "value": "<plaintext string for non-sensitive inputs, or null>",\n'
            '  "valueRef": "<LOCAL_SECRET_01|LOCAL_SECRET_02|LOCAL_SECRET_03|LOCAL_SECRET_04|LOCAL_SECRET_05|null>",\n'
            '  "confidence": <float between 0.0 and 1.0>,\n'
            '  "reasoning": "<one sentence explanation>"\n'
            "}"
        )

    def _assert_no_pii_in_outbound_payload(self, serialized_body: str):
        """Second independent assertion specifically inspecting the serialized request body."""
        # 1. Canary secret assertion
        if CANARY_SECRET in serialized_body:
            raise ValueError("PRIVACY_INVARIANT_VIOLATION: Canary secret detected in outbound Ollama payload!")

        # 2. Raw value key assertion
        # Checks for '"value": "something"' where something is not null
        for match in re.finditer(r'"value"\s*:\s*"([^"]+)"', serialized_body):
            val = match.group(1).strip()
            if val and val != "null":
                raise ValueError(f"PRIVACY_INVARIANT_VIOLATION: Raw input value '{val}' leaked into outbound Ollama payload!")

    async def decide(self, task: str, elements: list[dict]) -> dict:
        prompt = self._build_prompt(task, elements)
        outbound_payload = {"model": self.model, "prompt": prompt, "format": "json", "stream": False}
        serialized_json = json.dumps(outbound_payload)

        # Step 5: Second independent privacy gate assertion on serialized payload
        self._assert_no_pii_in_outbound_payload(serialized_json)

        t0 = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(self.timeout, connect=3.0)) as client:
                resp = await client.post(
                    f"{self.base_url}/api/generate",
                    json=outbound_payload,
                )
                resp.raise_for_status()
                raw_data = resp.json()
                raw = raw_data.get("response", "")
        except httpx.ConnectError as e:
            raise RealReasonerUnavailableError(f"Connection refused at {self.base_url}", self.base_url, self.model) from e
        except httpx.TimeoutException as e:
            raise RealReasonerUnavailableError(f"Inference timed out after {self.timeout}s", self.base_url, self.model) from e
        except Exception as e:
            raise RealReasonerUnavailableError(f"Ollama API error: {e}", self.base_url, self.model) from e

        inference_ms = round((time.perf_counter() - t0) * 1000, 2)

        # Step 4: Strict Schema & Content Validation
        cleaned = re.sub(r"^```json|```$", "", raw.strip(), flags=re.MULTILINE).strip()
        try:
            parsed = json.loads(cleaned)
        except Exception as e:
            raise ValueError(f"Ollama returned malformed non-JSON output: {raw[:200]}") from e

        if not isinstance(parsed, dict):
            raise ValueError("Ollama response must be a JSON object dictionary")

        action = parsed.get("action")
        if action not in ACTION_TYPES:
            raise ValueError(f"Ollama returned an unrecognized action type: {action!r}")

        # Reject coordinates, javascript, eval, arbitrary selectors
        target = parsed.get("target")
        if target is not None:
            if not isinstance(target, dict):
                raise ValueError("Target must be a dictionary or null")
            if "x" in target or "y" in target or "coordinates" in target:
                raise ValueError("COORDINATE_INJECTION_BLOCKED: Raw pixel coordinates are forbidden in semantic actions")
            for key in ["script", "eval", "code", "javascript", "selector", "xpath"]:
                if key in target:
                    raise ValueError(f"MALICIOUS_FIELD_BLOCKED: '{key}' is forbidden in target descriptor")

        # Reject raw secrets if returned by model
        val = parsed.get("value")
        if val and isinstance(val, str):
            if any(marker in val for marker in ["4111", "421", "password", "secret"]):
                raise ValueError("RAW_SECRET_OUTPUT_BLOCKED: Model attempted to output raw secret in plaintext value field")

        # Unknown top-level fields check
        allowed_keys = {"action", "target", "value", "valueRef", "confidence", "reasoning"}
        extra_keys = set(parsed.keys()) - allowed_keys
        if extra_keys:
            raise ValueError(f"SCHEMA_VIOLATION_BLOCKED: Unknown fields returned by model: {extra_keys}")

        parsed["_telemetry"] = {
            "inferenceMs": inference_ms,
            "rawLength": len(raw),
            "model": self.model,
            "endpoint": self.base_url,
        }
        return parsed


def probe_ollama_sync() -> Tuple[bool, list[str], Optional[str]]:
    """Probes local Ollama instance synchronously for available models."""
    url = os.environ.get("VEIL_OLLAMA_URL", "http://localhost:11434").rstrip("/")
    try:
        with httpx.Client(timeout=0.6) as client:
            r = client.get(f"{url}/api/tags")
            if r.status_code == 200:
                models = [m.get("name", "") for m in r.json().get("models", [])]
                preferred_order = ["qwen2-vl", "llama3.2-vision", "llama3.2", "mistral", "phi3"]
                detected_model = None
                for pref in preferred_order:
                    for m in models:
                        if pref in m.lower():
                            detected_model = m
                            break
                    if detected_model:
                        break
                if not detected_model and models:
                    detected_model = models[0]
                return True, models, detected_model
    except Exception:
        pass
    return False, [], None


def is_evidence_mode() -> bool:
    return os.environ.get("VEIL_EVIDENCE_MODE", "false").lower() in ("true", "1", "yes")


def get_vlm_client():
    evidence_mode = is_evidence_mode()
    backend_pref = os.environ.get("VEIL_VLM_BACKEND", "auto").lower()

    if evidence_mode or backend_pref == "ollama":
        is_online, installed_models, detected_model = probe_ollama_sync()
        if not is_online:
            if evidence_mode:
                endpoint = os.environ.get("VEIL_OLLAMA_URL", "http://localhost:11434")
                target_model = os.environ.get("VEIL_OLLAMA_MODEL", "qwen2-vl:7b")
                raise RealReasonerUnavailableError("Ollama service offline or unreachable on host", endpoint, target_model)
            return MockVLMClient()
        target_model = os.environ.get("VEIL_OLLAMA_MODEL", detected_model or "qwen2-vl:7b")
        return OllamaVLMClient(model=target_model)

    if backend_pref == "mock":
        return MockVLMClient()

    # auto mode
    is_online, installed_models, detected_model = probe_ollama_sync()
    if is_online and detected_model:
        return OllamaVLMClient(model=detected_model)

    return MockVLMClient()
