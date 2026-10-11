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


def speech(*kinds, seconds, offset=0.0):
    """Words back to back over `seconds`, from `offset`: "w" is a spoken word, "um" a Filler."""
    step = seconds / len(kinds)
    return [
        Word(
            text=k,
            start=offset + i * step,
            end=offset + (i + 1) * step,
            is_filler=k == "um",
        )
        for i, k in enumerate(kinds)
    ]


def test_metrics_wpm_is_words_per_minute_of_speech(client):
    # 30 words in 15 seconds is 120 a minute.
    use(FakeTranscriber(speech(*["w"] * 30, seconds=15)))

    metrics = post_audio(client).json()["metrics"]

    assert metrics["wpm"] == 120
    assert metrics["filler_count"] == 0
    assert metrics["typical_wpm"] == {"low": 120, "high": 160}


def test_metrics_wpm_excludes_fillers_from_the_word_count(client):
    # 30 words and 10 Fillers in 20 seconds: 30 words / (20/60) minutes = 90.
    use(FakeTranscriber(speech(*["w", "w", "w", "um"] * 10, seconds=20)))

    metrics = post_audio(client).json()["metrics"]

    assert metrics["wpm"] == 90
    assert metrics["filler_count"] == 10


def test_metrics_leading_and_trailing_fillers_are_part_of_the_speaking_time(client):
    # 30 words between two Fillers, 20 seconds in all: 90. Timing from the first
    # and last non-Filler words instead would give 96.
    use(FakeTranscriber(speech("um", *["w"] * 30, "um", seconds=20)))

    metrics = post_audio(client).json()["metrics"]

    assert metrics["wpm"] == 90
    assert metrics["filler_count"] == 2


def test_metrics_silence_before_the_first_word_doesnt_change_wpm(client):
    # Speaking starts 5 seconds in. Trailing silence never reaches the words at all,
    # so timing ends at the last word's end either way.
    use(FakeTranscriber(speech(*["w"] * 30, seconds=15, offset=5)))

    assert post_audio(client).json()["metrics"]["wpm"] == 120


def test_no_metrics_when_there_is_not_enough_speech(client):
    use(FakeTranscriber(speech(*["w"] * 14, "um", seconds=10)))

    body = post_audio(client).json()

    assert body["enough_speech"] is False
    assert "metrics" not in body


def timeline(*items):
    """Words 0.3s long, back to back: "w" is a spoken word, "um" a Filler, a number is silence.

    Padded with spoken words to 15, so there's always enough speech.
    """
    out, t = [], 0.0
    for item in [*items, *["w"] * (15 - items.count("w"))]:
        if isinstance(item, float):
            t += item
        else:
            out.append(Word(text=item, start=t, end=t + 0.3, is_filler=item == "um"))
            t += 0.3
    return out


def metrics_for(client, *items):
    use(FakeTranscriber(timeline(*items)))
    return post_audio(client).json()["metrics"]


def test_no_pauses_in_steady_speech(client):
    metrics = metrics_for(client, "w", "um", "w", 0.5, "w")

    assert metrics["pause_count"] == 0
    assert metrics["pauses"] == []
    assert "longest_pause" not in metrics


def test_a_gap_of_exactly_the_threshold_is_a_pause(client):
    # 2.51 - 1.01 is 1.4999999999999998 in floating point, which must still count.
    first, *rest = timeline()
    shift = 2.51 - rest[0].start
    use(
        FakeTranscriber(
            [
                first.model_copy(update={"end": 1.01}),
                *[
                    w.model_copy(update={"start": w.start + shift, "end": w.end + shift})
                    for w in rest
                ],
            ]
        )
    )

    assert post_audio(client).json()["metrics"]["pauses"] == [{"after": 0, "duration": 1.5}]


def test_a_gap_just_under_the_threshold_is_not_a_pause(client):
    metrics = metrics_for(client, "w", "w", 1.49, "w")

    assert metrics["pause_count"] == 0
    assert metrics["pauses"] == []
    assert "longest_pause" not in metrics


def test_a_gap_just_over_the_threshold_is_a_pause(client):
    metrics = metrics_for(client, "w", "w", 1.51, "w")

    assert metrics["pause_count"] == 1
    # It follows the second word, transcript index 1.
    assert metrics["pauses"] == [{"after": 1, "duration": 1.51}]
    assert metrics["longest_pause"] == 1.51


def test_a_filler_inside_a_silence_does_not_split_the_pause(client):
    # "w ... um ... w": 1s, a 0.3s Filler, 1s. Neither silence alone is a Pause, but the gap
    # between the spoken words is 2.3s.
    metrics = metrics_for(client, "w", 1.0, "um", 1.0, "w")

    assert metrics["pauses"] == [{"after": 0, "duration": 2.3}]


def test_several_pauses_are_listed_in_order_with_the_longest(client):
    metrics = metrics_for(client, "w", 2.0, "w", "w", "um", 1.6, "w", 3.25, "w")

    assert metrics["pause_count"] == 3
    assert metrics["pauses"] == [
        {"after": 0, "duration": 2.0},
        {"after": 2, "duration": 1.9},
        {"after": 4, "duration": 3.25},
    ]
    assert metrics["longest_pause"] == 3.25


def test_silence_before_the_first_spoken_word_is_not_a_pause(client):
    # A leading Filler then silence: there's no spoken word for a Pause to follow.
    metrics = metrics_for(client, "um", 3.0, "w")

    assert metrics["pause_count"] == 0


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
