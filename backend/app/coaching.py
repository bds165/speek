"""The Coach interface: Topic, transcript and Metrics in, Coaching out.

Like the Transcriber, the rest of the backend only sees these types, so the LLM provider
can be swapped without touching the pipeline.
"""

import re
from typing import Literal, Protocol

from pydantic import BaseModel, Field

from app.metrics import Metrics
from app.transcription import Word

Category = Literal[
    "structure", "clarity", "hedging", "verbal tic", "fillers", "pace", "pauses", "relevance"
]


class Improvement(BaseModel):
    category: Category
    quote: str = Field(description="Exact words from the transcript, copied verbatim.")
    explanation: str
    # Absent when there's nothing more concrete to say than the explanation.
    suggestion: str | None = None


class Coaching(BaseModel):
    """No score of any kind, on purpose."""

    strengths: list[str] = Field(min_length=1, max_length=2)
    improvements: list[Improvement] = Field(min_length=2, max_length=3)
    next_step: str


class CoachError(Exception):
    """The provider failed or returned something that isn't valid Coaching."""


class Coach(Protocol):
    def coach(self, topic: str, words: list[Word], metrics: Metrics) -> Coaching: ...


def marked_transcript(words: list[Word], metrics: Metrics) -> str:
    """The transcript as text, Fillers in [brackets] and each Pause as (pause 2.1s)."""
    pause_after = {p.after: p.duration for p in metrics.pauses}
    parts = []
    for i, w in enumerate(words):
        parts.append(f"[{w.text}]" if w.is_filler else w.text)
        if i in pause_after:
            parts.append(f"(pause {pause_after[i]:.1f}s)")
    return " ".join(parts)


def _normalise(text: str) -> str:
    # Lowercase words separated by single spaces; punctuation (and the [Filler] brackets) gone.
    return " ".join(re.sub(r"[^\w\s]", "", text.lower()).split())


def drop_invented_quotes(coaching: Coaching, words: list[Word]) -> Coaching:
    """Remove improvements whose quote isn't in the transcript (ignoring case and punctuation).

    An LLM sometimes paraphrases when asked to quote. A quote the user never said would
    be worse than no improvement, so it goes.
    """
    # Padded with spaces so a quote only matches whole words: "the" isn't found in "other".
    spoken = f" {_normalise(' '.join(w.text for w in words))} "
    kept = [
        imp
        for imp in coaching.improvements
        if _normalise(imp.quote) and f" {_normalise(imp.quote)} " in spoken
    ]
    return coaching.model_copy(update={"improvements": kept})
