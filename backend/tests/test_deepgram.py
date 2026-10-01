"""Deepgram adapter tests: replay a saved Deepgram response through a fake HTTP transport."""

import json
from pathlib import Path

import httpx
import pytest

from app.deepgram import DeepgramTranscriber
from app.transcription import TranscriptionError, Word

FIXTURE = Path(__file__).parent / "fixtures" / "deepgram_response.json"


def transcriber_returning(handler):
    """A DeepgramTranscriber whose HTTP calls go to `handler` instead of the network."""
    client = httpx.Client(transport=httpx.MockTransport(handler))
    return DeepgramTranscriber("test-key", client)


def replay_fixture(requests):
    body = json.loads(FIXTURE.read_text())

    def handler(request):
        requests.append(request)
        return httpx.Response(200, json=body)

    return handler


def test_maps_deepgram_words_to_transcript_words():
    # The fixture is a real response to: "I, uh, graduate in 2027. Uh, I currently, um, ..."
    words = transcriber_returning(replay_fixture([])).transcribe(b"audio", "audio/webm")

    assert words[:3] == [
        Word(text="I,", start=1.92, end=2.42, is_filler=False),
        Word(text="uh,", start=3.84, end=4.16, is_filler=True),
        Word(text="graduate", start=4.16, end=4.66, is_filler=False),
    ]
    assert [w.text for w in words if w.is_filler] == ["uh,", "Uh,", "um,", "Um,", "um,", "Uh,"]
    assert " ".join(w.text for w in words).startswith(
        "I, uh, graduate in 2027. Uh, I currently, um, major in computer science,"
    )
    assert all(w.start <= w.end for w in words)


def test_sends_audio_with_filler_words_on():
    requests = []
    transcriber_returning(replay_fixture(requests)).transcribe(b"audio-bytes", "audio/mp4")

    [request] = requests
    assert request.url.host == "api.deepgram.com"
    assert request.url.path == "/v1/listen"
    assert request.url.params["filler_words"] == "true"
    assert request.url.params["model"] == "nova-2"
    assert request.url.params["language"] == "en"
    assert request.url.params["smart_format"] == "true"
    assert request.headers["Authorization"] == "Token test-key"
    assert request.headers["Content-Type"] == "audio/mp4"
    assert request.content == b"audio-bytes"


def test_error_status_raises_transcription_error():
    t = transcriber_returning(lambda r: httpx.Response(401, json={"err_msg": "bad key"}))
    with pytest.raises(TranscriptionError):
        t.transcribe(b"audio", "audio/webm")


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"results": {"channels": []}},
        {"results": {"channels": [{"alternatives": [{"words": [{"word": "hi"}]}]}]}},
    ],
)
def test_malformed_response_raises_transcription_error(body):
    t = transcriber_returning(lambda r: httpx.Response(200, json=body))
    with pytest.raises(TranscriptionError):
        t.transcribe(b"audio", "audio/webm")


def test_non_json_response_raises_transcription_error():
    t = transcriber_returning(lambda r: httpx.Response(200, text="<html>oops</html>"))
    with pytest.raises(TranscriptionError):
        t.transcribe(b"audio", "audio/webm")


def test_network_error_raises_transcription_error():
    def handler(request):
        raise httpx.ConnectError("no network")

    with pytest.raises(TranscriptionError):
        transcriber_returning(handler).transcribe(b"audio", "audio/webm")
