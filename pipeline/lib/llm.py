import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

_client = OpenAI(
    api_key=os.environ["LLM_API_KEY"],
    base_url=os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1"),
)

FAST_MODEL = os.environ.get("LLM_MODEL_NAME", "gpt-4o-mini")
REASONING_MODEL = os.environ.get("LLM_MODEL_NAME_REASONING", FAST_MODEL)


def _extract_json(text: str):
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    return json.loads(text)


def call_json(system_prompt: str, user_prompt: str, *, model: str = FAST_MODEL, max_retries: int = 3):
    last_err = None
    for _ in range(max_retries):
        try:
            resp = _client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
            )
            content = resp.choices[0].message.content
            return _extract_json(content)
        except Exception as e:  # noqa: BLE001
            last_err = e
    raise RuntimeError(f"LLM call failed after {max_retries} attempts: {last_err}")
