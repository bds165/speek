"""Record a real Deepgram response as the adapter tests' fixture.

Run once from backend/:  .venv/Scripts/python scripts/record_deepgram_fixture.py
Uses DEEPGRAM_API_KEY from .env and tests/fixtures/sample.local.webm, and overwrites
tests/fixtures/deepgram_response.json. Update the expectations in
tests/test_deepgram.py to match what you said afterwards.
"""

import json
import sys
from pathlib import Path

import httpx

# Run as a plain script, so make `app` importable from backend/.
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.deepgram import PARAMS, URL

FIXTURES = Path(__file__).parent.parent / "tests" / "fixtures"

response = httpx.post(
    URL,
    params=PARAMS,
    content=(FIXTURES / "sample.local.webm").read_bytes(),
    headers={"Authorization": f"Token {settings.deepgram_api_key}", "Content-Type": "audio/webm"},
    timeout=60,
)
response.raise_for_status()
(FIXTURES / "deepgram_response.json").write_text(json.dumps(response.json(), indent=2) + "\n")
print(response.json()["results"]["channels"][0]["alternatives"][0]["transcript"])
