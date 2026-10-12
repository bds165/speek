"""Gemini adapter tests: canned Gemini responses through a fake HTTP transport."""

import json

import httpx
import pytest

from app.coaching import CoachError, Coaching, Improvement
from app.gemini import GeminiCoach
from app.metrics import Metrics, Pause, WpmBand
from app.transcription import Word

TOPIC = "Describe a place you love."

# "I love the, um, library. It's quiet." with a Pause after "library."
WORDS = [
    Word(text=t, start=i, end=i + 0.5, is_filler=t == "um,")
    for i, t in enumerate(["I", "love", "the,", "um,", "library.", "It's", "quiet."])
]

METRICS = Metrics(
    wpm=142,
    typical_wpm=WpmBand(low=120, high=160),
    filler_count=1,
    pause_count=1,
    longest_pause=2.14,
    pauses=[Pause(after=4, duration=2.14)],
)


def improvement(quote, **extra):
    return {"category": "clarity", "quote": quote, "explanation": "Because.", **extra}


def coaching_json(*improvements):
    return {
        "strengths": ["A clear opening."],
        "improvements": list(improvements)
        or [
            improvement("love the, um, library"),
            improvement("It's quiet.", suggestion="Say why."),
        ],
        "next_step": "Give one more detail.",
    }


def gemini_reply(text):
    """A generateContent response whose answer is `text`."""
    return {"candidates": [{"content": {"role": "model", "parts": [{"text": text}]}}]}


def coach_replying(body, status=200, requests=None):
    def handler(request):
        if requests is not None:
            requests.append(request)
        return httpx.Response(status, json=body)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    return GeminiCoach("test-key", "gemini-test-model", client)


def coach(body, **kwargs):
    return coach_replying(body, **kwargs).coach(TOPIC, WORDS, METRICS)


def test_valid_response_maps_to_coaching():
    assert coach(gemini_reply(json.dumps(coaching_json()))) == Coaching(
        strengths=["A clear opening."],
        improvements=[
            Improvement(category="clarity", quote="love the, um, library", explanation="Because."),
            Improvement(
                category="clarity",
                quote="It's quiet.",
                explanation="Because.",
                suggestion="Say why.",
            ),
        ],
        next_step="Give one more detail.",
    )


def test_sends_the_topic_marked_transcript_metrics_and_schema():
    requests = []
    coach(gemini_reply(json.dumps(coaching_json())), requests=requests)

    [request] = requests
    assert request.url.path.endswith("/models/gemini-test-model:generateContent")
    assert request.headers["x-goog-api-key"] == "test-key"
    sent = json.loads(request.content)
    prompt = sent["contents"][0]["parts"][0]["text"]
    assert TOPIC in prompt
    assert "I love the, [um,] library. (pause 2.1s) It's quiet." in prompt
    assert "142 words a minute" in prompt
    assert "1 Fillers" in prompt
    assert "1 Pauses, the longest 2.1s" in prompt
    config = sent["generationConfig"]
    assert config["responseMimeType"] == "application/json"
    assert config["responseJsonSchema"] == Coaching.model_json_schema()
    assert "hedging" in sent["systemInstruction"]["parts"][0]["text"]


def quotes_kept(*quotes):
    body = coaching_json(*[improvement(q) for q in quotes])
    return [i.quote for i in coach(gemini_reply(json.dumps(body))).improvements]


def test_an_invented_quote_is_dropped():
    assert quotes_kept("I really love it", "the library", "love the, um, library") == [
        "love the, um, library"
    ]


def test_a_quote_differing_only_in_case_and_punctuation_is_kept():
    assert quotes_kept("LIBRARY it's quiet", "the um library") == [
        "LIBRARY it's quiet",
        "the um library",
    ]


def test_a_quote_must_be_whole_words():
    # "ove th" appears in "love the" as letters, but not as words.
    assert quotes_kept("ove th", "It's quiet.") == ["It's quiet."]


@pytest.mark.parametrize(
    "text",
    [
        "not json at all",
        json.dumps({"strengths": ["Good."], "next_step": "Go."}),  # no improvements
        json.dumps(coaching_json(improvement("I love", category="tone"), improvement("quiet"))),
        json.dumps({**coaching_json(), "strengths": []}),  # needs 1-2
        json.dumps(coaching_json(*[improvement("I love")] * 4)),  # needs 2-3
    ],
)
def test_malformed_coaching_raises_coach_error(text):
    with pytest.raises(CoachError):
        coach(gemini_reply(text))


def test_a_response_with_no_answer_raises_coach_error():
    with pytest.raises(CoachError):
        coach({"candidates": []})


def test_error_status_raises_coach_error():
    with pytest.raises(CoachError):
        coach({"error": {"code": 400, "message": "API key not valid"}}, status=400)


def test_network_error_raises_coach_error():
    def handler(request):
        raise httpx.ConnectError("no network")

    client = httpx.Client(transport=httpx.MockTransport(handler))
    with pytest.raises(CoachError):
        GeminiCoach("test-key", "gemini-test-model", client).coach(TOPIC, WORDS, METRICS)
