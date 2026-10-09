"""POST /api/feedback: turn an Attempt's audio into Feedback."""

from collections.abc import Iterator
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel

from app.config import settings
from app.deepgram import DeepgramTranscriber
from app.limits import MAX_UPLOAD_BYTES, MIN_SPEECH_WORDS, TYPICAL_WPM_HIGH, TYPICAL_WPM_LOW
from app.transcription import Transcriber, TranscriptionError, Word

router = APIRouter()

# What browsers' MediaRecorder produces: Opus in WebM (Chrome, Firefox), AAC in MP4 (Safari).
SUPPORTED_TYPES = {"audio/webm", "audio/mp4"}


class WpmBand(BaseModel):
    low: int
    high: int


class Metrics(BaseModel):
    wpm: int
    typical_wpm: WpmBand
    filler_count: int


class Feedback(BaseModel):
    transcript: list[Word]
    enough_speech: bool
    # Absent (not null) when there isn't enough speech: see `response_model_exclude_none` below.
    metrics: Metrics | None = None


def count_spoken(words: list[Word]) -> int:
    return sum(1 for w in words if not w.is_filler)


def calculate_metrics(words: list[Word]) -> Metrics:
    spoken = count_spoken(words)
    # From the first word's start to the last word's end, so silence before and after doesn't
    # count. Fillers at either end are still speaking time, so they're part of the span.
    minutes = (words[-1].end - words[0].start) / 60
    return Metrics(
        wpm=round(spoken / minutes),
        typical_wpm=WpmBand(low=TYPICAL_WPM_LOW, high=TYPICAL_WPM_HIGH),
        filler_count=len(words) - spoken,
    )


def get_transcriber() -> Iterator[Transcriber]:
    """The real Transcriber. Tests replace this through `app.dependency_overrides`."""
    if not settings.deepgram_api_key:
        raise HTTPException(503, "Transcription is not configured on the server.")
    # A generator dependency: FastAPI closes the HTTP client after the request.
    with httpx.Client() as client:
        yield DeepgramTranscriber(settings.deepgram_api_key, client)


@router.post("/api/feedback", response_model_exclude_none=True)
async def create_feedback(
    audio: UploadFile,
    transcriber: Annotated[Transcriber, Depends(get_transcriber)],
) -> Feedback:
    # "audio/webm;codecs=opus" -> "audio/webm"
    mime_type = audio.content_type or ""
    if mime_type.split(";")[0].strip().lower() not in SUPPORTED_TYPES:
        raise HTTPException(415, "That audio format isn't supported. Try recording again.")

    # Read one byte past the limit, so we can tell "too big" without reading all of it.
    data = await audio.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            413, f"The recording is too large (over {MAX_UPLOAD_BYTES // (1024 * 1024)} MB)."
        )
    if not data:
        raise HTTPException(400, "The recording is empty. Try recording again.")

    try:
        words = transcriber.transcribe(data, mime_type)
    except TranscriptionError as e:
        raise HTTPException(502, "We couldn't transcribe your recording. Please try again.") from e

    if count_spoken(words) < MIN_SPEECH_WORDS:
        return Feedback(transcript=words, enough_speech=False)
    return Feedback(transcript=words, enough_speech=True, metrics=calculate_metrics(words))
