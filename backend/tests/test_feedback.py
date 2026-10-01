import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.feedback import get_transcriber
from app.limits import MAX_UPLOAD_BYTES
from app.main import app
from app.transcription import TranscriptionError, Word


class FakeTranscriber:
    """Returns a canned word list and records what it was given."""

    def __init__(self, words=None, error=None):
        self.words = words or []
        self.error = error
        self.calls = []

    def transcribe(self, audio, mime_type):
        self.calls.append((audio, mime_type))
        if self.error:
            raise self.error
        return self.words


def words(n, fillers=0):
    """n spoken words, followed by `fillers` Fillers, half a second apart."""
    out = [Word(text=f"w{i}", start=i * 0.5, end=i * 0.5 + 0.4, is_filler=False) for i in range(n)]
    for j in range(fillers):
        t = (n + j) * 0.5
        out.append(Word(text="um", start=t, end=t + 0.3, is_filler=True))
    return out


@pytest.fixture
def client():
    yield TestClient(app)
    app.dependency_overrides.clear()


def use(transcriber):
    app.dependency_overrides[get_transcriber] = lambda: transcriber
    return transcriber


def post_audio(client, data=b"fake-audio", content_type="audio/webm;codecs=opus"):
    return client.post("/api/feedback", files={"audio": ("attempt.webm", data, content_type)})


def test_returns_transcript_with_fillers(client):
    spoken = [
        Word(text="So,", start=0.1, end=0.4, is_filler=False),
        Word(text="um,", start=0.6, end=0.9, is_filler=True),
        *words(15),
    ]
    fake = use(FakeTranscriber(spoken))

    r = post_audio(client)

    assert r.status_code == 200
    body = r.json()
    assert body["enough_speech"] is True
    assert body["transcript"][:2] == [
        {"text": "So,", "start": 0.1, "end": 0.4, "is_filler": False},
        {"text": "um,", "start": 0.6, "end": 0.9, "is_filler": True},
    ]
    assert len(body["transcript"]) == 17
    assert fake.calls == [(b"fake-audio", "audio/webm;codecs=opus")]


def test_accepts_mp4_audio_from_safari(client):
    use(FakeTranscriber(words(15)))
    assert post_audio(client, content_type="audio/mp4").status_code == 200


def test_14_spoken_words_is_not_enough_speech(client):
    # Fillers don't count towards the minimum.
    use(FakeTranscriber(words(14, fillers=5)))

    r = post_audio(client)

    assert r.status_code == 200
    assert r.json()["enough_speech"] is False
    assert len(r.json()["transcript"]) == 19


def test_15_spoken_words_is_enough_speech(client):
    use(FakeTranscriber(words(15)))
    assert post_audio(client).json()["enough_speech"] is True


def test_silence_is_not_enough_speech(client):
    use(FakeTranscriber([]))
    r = post_audio(client)
    assert r.status_code == 200
    assert r.json() == {"transcript": [], "enough_speech": False}


def test_empty_audio_is_rejected(client):
    fake = use(FakeTranscriber(words(15)))
    r = post_audio(client, data=b"")
    assert r.status_code == 400
    assert "empty" in r.json()["detail"].lower()
    assert fake.calls == []


def test_missing_audio_field_is_rejected(client):
    use(FakeTranscriber(words(15)))
    assert client.post("/api/feedback").status_code in (400, 422)


def test_unsupported_audio_type_is_rejected(client):
    fake = use(FakeTranscriber(words(15)))
    r = post_audio(client, content_type="text/plain")
    assert r.status_code == 415
    assert "format" in r.json()["detail"].lower()
    assert fake.calls == []


def test_oversized_audio_is_rejected(client):
    fake = use(FakeTranscriber(words(15)))
    r = post_audio(client, data=b"x" * (MAX_UPLOAD_BYTES + 1))
    assert r.status_code == 413
    assert "10 MB" in r.json()["detail"]
    assert fake.calls == []


def test_audio_at_the_size_limit_is_accepted(client):
    use(FakeTranscriber(words(15)))
    assert post_audio(client, data=b"x" * MAX_UPLOAD_BYTES).status_code == 200


def test_transcription_failure_is_a_502(client):
    use(FakeTranscriber(error=TranscriptionError("Deepgram returned 500")))
    r = post_audio(client)
    assert r.status_code == 502
    assert "try again" in r.json()["detail"].lower()
    # The provider's internal message isn't leaked to the user.
    assert "Deepgram returned 500" not in r.json()["detail"]


def test_missing_deepgram_key_is_a_503(client, monkeypatch):
    # No override: use the real dependency, with no key configured.
    monkeypatch.setattr(settings, "deepgram_api_key", "")
    r = post_audio(client)
    assert r.status_code == 503
    assert "not configured" in r.json()["detail"].lower()
