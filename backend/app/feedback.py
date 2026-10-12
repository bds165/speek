"""POST /api/feedback: turn an Attempt's audio into Feedback."""

from collections.abc import Iterator
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.coaching import Coach, CoachError, Coaching
from app.config import settings
from app.deepgram import DeepgramTranscriber
from app.gemini import GeminiCoach
from app.limits import MAX_UPLOAD_BYTES, MIN_SPEECH_WORDS
from app.metrics import Metrics, calculate_metrics, count_spoken
from app.transcription import Transcriber, TranscriptionError, Word

router = APIRouter()

# What browsers' MediaRecorder produces: Opus in WebM (Chrome, Firefox), AAC in MP4 (Safari).
SUPPORTED_TYPES = {"audio/webm", "audio/mp4"}


class Feedback(BaseModel):
    transcript: list[Word]
    enough_speech: bool
    # Both absent (not null) when there isn't enough speech: see `response_model_exclude_none`.
    metrics: Metrics | None = None
    coaching: Coaching | None = None


def get_transcriber() -> Iterator[Transcriber]:
    """The real Transcriber. Tests replace this through `app.dependency_overrides`."""
    if not settings.deepgram_api_key:
        raise HTTPException(503, "Transcription is not configured on the server.")
    # A generator dependency: FastAPI closes the HTTP client after the request.
    with httpx.Client() as client:
        yield DeepgramTranscriber(settings.deepgram_api_key, client)


def get_coach() -> Iterator[Coach]:
    """The real Coach. Tests replace this through `app.dependency_overrides`."""
    if not settings.gemini_api_key:
        raise HTTPException(503, "Coaching is not configured on the server.")
    with httpx.Client() as client:
        yield GeminiCoach(settings.gemini_api_key, settings.gemini_model, client)


@router.post("/api/feedback", response_model_exclude_none=True)
async def create_feedback(
    audio: UploadFile,
    # Sent by the frontend: whatever the Topic card shows.
    topic: Annotated[str, Form()],
    transcriber: Annotated[Transcriber, Depends(get_transcriber)],
    coach: Annotated[Coach, Depends(get_coach)],
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

    metrics = calculate_metrics(words)
    try:
        coaching = coach.coach(topic, words, metrics)
    except CoachError as e:
        raise HTTPException(502, "We couldn't write your coaching. Please try again.") from e
    return Feedback(transcript=words, enough_speech=True, metrics=metrics, coaching=coaching)
