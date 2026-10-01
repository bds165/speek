"""The Transcriber interface: audio in, ordered words out.

The rest of the backend only sees these types, never a provider's response format,
so the transcription provider can be swapped without touching the pipeline.
"""

from typing import Protocol

from pydantic import BaseModel


class Word(BaseModel):
    text: str  # display text, punctuated (e.g. "Hello,")
    start: float  # seconds from the start of the audio
    end: float
    is_filler: bool


class TranscriptionError(Exception):
    """The provider failed or returned something we couldn't understand."""


class Transcriber(Protocol):
    def transcribe(self, audio: bytes, mime_type: str) -> list[Word]: ...
