"""Opt-in live test: one real Gemini call. Run with `.venv/Scripts/pytest -m live`.

Needs GEMINI_API_KEY in .env. Uses GEMINI_MODEL, so it also checks the model name is valid.
"""

import httpx
import pytest

from app.config import settings
from app.gemini import GeminiCoach
from app.metrics import calculate_metrics
from app.transcription import Word

pytestmark = pytest.mark.live

SPOKEN = (
    "So, um, my favourite place is the, uh, library near my house. It's, like, really quiet "
    "and I guess I kind of go there to study, um, most weekends. The big windows make it "
    "feel calm."
)


@pytest.mark.skipif(not settings.gemini_api_key, reason="GEMINI_API_KEY not set")
def test_coaches_a_short_attempt():
    words = [
        Word(text=t, start=i * 0.4, end=i * 0.4 + 0.3, is_filler=t.strip(",.") in {"um", "uh"})
        for i, t in enumerate(SPOKEN.split())
    ]
    with httpx.Client() as client:
        coaching = GeminiCoach(settings.gemini_api_key, settings.gemini_model, client).coach(
            "Describe a place you love.", words, calculate_metrics(words)
        )
    assert 1 <= len(coaching.strengths) <= 2
    # Some improvements may have been dropped for an invented quote, but not usually all.
    assert coaching.improvements
    assert coaching.next_step
