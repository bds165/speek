"""Opt-in live test: one real Deepgram call. Run with `.venv/Scripts/pytest -m live`.

Needs DEEPGRAM_API_KEY in .env and a short clip of you speaking (with an "um" or two)
saved as tests/fixtures/sample.local.webm (git-ignored).
"""

from pathlib import Path

import httpx
import pytest

from app.config import settings
from app.deepgram import DeepgramTranscriber

SAMPLE = Path(__file__).parent / "fixtures" / "sample.local.webm"

pytestmark = pytest.mark.live


@pytest.mark.skipif(not settings.deepgram_api_key, reason="DEEPGRAM_API_KEY not set")
@pytest.mark.skipif(not SAMPLE.exists(), reason=f"no sample clip at {SAMPLE}")
def test_transcribes_sample_clip():
    with httpx.Client() as client:
        words = DeepgramTranscriber(settings.deepgram_api_key, client).transcribe(
            SAMPLE.read_bytes(), "audio/webm"
        )
    assert words, "expected some words"
    assert all(w.start <= w.end for w in words)
