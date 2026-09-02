"""
VEIL -- VLM client abstraction with Local Secret ValueRef Support.

Two backends behind one interface:
  - MockVLMClient: deterministic rule-based reasoner supporting ValueRef actions
    (e.g. LOCAL_SECRET_01 for card, LOCAL_SECRET_03 for address) and button clicks.
  - OllamaVLMClient: calls a local Ollama server (Qwen2-VL / Llama3.2).
"""

import json
import os
import re
from typing import Optional

import httpx

ACTION_TYPES = {"click", "type", "scroll", "wait", "none", "finish"}

COMMIT_WORDS = {"buy", "purchase", "checkout", "complete", "order", "submit", "confirm", "pay", "place"}


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

    async def decide(self, task: str, elements: list[dict]) -> dict:
        task_lower = task.lower()

        # Check for unfilled sensitive fields that match local secret vault references
        for el in elements:
            label = el.get("label", "").lower()
            tag = el.get("tag", "").lower()

            # Only consider inputs/textareas
            if tag not in ["input", "textarea"]:
                continue

            # Card field -> propose LOCAL_SECRET_01
            if ("card" in label or "cc" in label) and "submit" not in label:
                return {
                    "action": "type",
                    "target": {"id": el["id"], "description": f"{el['tag']} labeled {el['label']}"},
                    "value": None,
                    "valueRef": "LOCAL_SECRET_01",
                    "confidence": 0.95,
                    "reasoning": f"Inject local secret reference 'LOCAL_SECRET_01' (Demo Card) into '{el['label']}' without exposing raw data.",
                }

            # CVV field -> propose LOCAL_SECRET_02
            if "cvv" in label or "cvc" in label or "security code" in label:
                return {
                    "action": "type",
                    "target": {"id": el["id"], "description": f"{el['tag']} labeled {el['label']}"},
                    "value": None,
                    "valueRef": "LOCAL_SECRET_02",
                    "confidence": 0.95,
                    "reasoning": f"Inject local secret reference 'LOCAL_SECRET_02' (Demo CVV) into '{el['label']}'.",
                }

            # Address field -> propose LOCAL_SECRET_03
            if "address" in label or "street" in label:
                return {
                    "action": "type",
                    "target": {"id": el["id"], "description": f"{el['tag']} labeled {el['label']}"},
                    "value": None,
                    "valueRef": "LOCAL_SECRET_03",
                    "confidence": 0.92,
                    "reasoning": f"Inject local secret reference 'LOCAL_SECRET_03' (Shipping Address) into '{el['label']}'.",
                }

        # Otherwise find best primary button (Place order / Checkout / Complete purchase)
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
    """Calls a local Ollama server supporting ValueRef references."""

    backend_name = "ollama"

    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base_url = base_url or os.environ.get("VEIL_OLLAMA_URL", "http://localhost:11434")
        self.model = model or os.environ.get("VEIL_OLLAMA_MODEL", "llama3.2")

    def _build_prompt(self, task: str, elements: list[dict]) -> str:
        return (
            "You control a web page through a fixed set of interactive elements. "
            "You never see field values, only their purpose. "
            "For sensitive fields (card, address, name), you MUST specify 'valueRef': 'LOCAL_SECRET_01' "
            "instead of raw values. Raw secret values must NEVER be output.\n\n"
            f"Task: {task}\n\n"
            f"Elements (JSON): {json.dumps(elements)}\n\n"
            "Respond with ONLY a JSON object, no other text, matching exactly:\n"
            '{"action": "click|type|scroll|wait|finish|none", '
            '"target": {"id": "<element id or null>", "description": "<short description>"} or null, '
            '"value": "<plaintext only for non-sensitive inputs, or null>", '
            '"valueRef": "<LOCAL_SECRET_01|LOCAL_SECRET_02|LOCAL_SECRET_03 or null>", '
            '"confidence": <0..1>, '
            '"reasoning": "<one sentence>"}'
        )

    async def decide(self, task: str, elements: list[dict]) -> dict:
        prompt = self._build_prompt(task, elements)
        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=5.0)) as client:
            resp = await client.post(
                f"{self.base_url}/api/generate",
                json={"model": self.model, "prompt": prompt, "format": "json", "stream": False},
            )
            resp.raise_for_status()
            raw = resp.json().get("response", "")

        cleaned = re.sub(r"^```json|```$", "", raw.strip(), flags=re.MULTILINE).strip()
        parsed = json.loads(cleaned)
        if parsed.get("action") not in ACTION_TYPES:
            raise ValueError(f"model returned an unrecognized action: {parsed.get('action')!r}")
        return parsed


def get_vlm_client():
    backend = os.environ.get("VEIL_VLM_BACKEND", "mock").lower()
    if backend == "ollama":
        return OllamaVLMClient()
    return MockVLMClient()
