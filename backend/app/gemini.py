"""Gemini adapter: the only module that knows Gemini's API.

Uses the google-genai SDK with structured output: Gemini is given Coaching's JSON schema
and must reply with JSON matching it, which we then validate ourselves anyway.
Docs: https://ai.google.dev/gemini-api/docs/structured-output
"""

import httpx
from google import genai
from google.genai import errors, types
from pydantic import ValidationError

from app.coaching import CoachError, Coaching, drop_invented_quotes, marked_transcript
from app.limits import PAUSE_SECONDS
from app.metrics import Metrics
from app.transcription import Word

INSTRUCTIONS = f"""\
You are a speaking coach. The user was given a Topic, spoke about it impromptu for about a \
minute, and was transcribed. Coach them on how they spoke, in English, in plain and \
encouraging words, speaking to them as "you".

In the transcript, Fillers (vocal hesitations like "um") are in [brackets] and each Pause \
(a silence of {PAUSE_SECONDS} seconds or more) is shown as (pause 2.1s).

Give:
- 1 or 2 strengths: specific things that worked.
- 2 or 3 improvements, the most useful first. Each has a category, a quote, an explanation \
and, when there's a concrete alternative, a suggestion.
- Exactly one next step: the single thing to try on the next attempt.

Rules:
- A quote must be copied exactly from the transcript: a short run of the user's own \
consecutive words. Don't include the (pause) marks. Never paraphrase or invent a quote.
- Verbal tics (real words used as padding, like "like", "you know", "basically") are only \
worth flagging where they're padding. "Like" in "I'd like to" or "it looks like" is not a tic.
- Suggest replacing Fillers with silence at most once in total, not for each Filler.
- "Confidence" is only ever about wording: hedging such as "I guess", "kind of", "maybe". \
Never comment on emotion, nerves, tone of voice or how confident the user sounded.
- Pace and Pauses come from the Metrics below: interpret them, don't recount or recompute \
them. A Pause can be a good thing (a deliberate beat) or a lost thread; say which it seems.
- Comment on how relevant the answer was to the Topic.
- Don't give a score, grade or rating of any kind.
"""


def build_prompt(topic: str, words: list[Word], metrics: Metrics) -> str:
    longest = f", the longest {metrics.longest_pause:.1f}s" if metrics.longest_pause else ""
    return (
        f"Topic: {topic}\n\n"
        f"Transcript:\n{marked_transcript(words, metrics)}\n\n"
        "Metrics:\n"
        f"- {metrics.wpm} words a minute (a typical range is "
        f"{metrics.typical_wpm.low}-{metrics.typical_wpm.high})\n"
        f"- {metrics.filler_count} Fillers\n"
        f"- {metrics.pause_count} Pauses{longest}\n"
    )


class GeminiCoach:
    def __init__(self, api_key: str, model: str, client: httpx.Client, timeout: float = 60.0):
        self.model = model
        self.client = genai.Client(
            api_key=api_key,
            # Our own httpx client, so tests can swap in a fake transport like the Deepgram tests.
            http_options=types.HttpOptions(httpx_client=client, timeout=int(timeout * 1000)),
        )

    def coach(self, topic: str, words: list[Word], metrics: Metrics) -> Coaching:
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=build_prompt(topic, words, metrics),
                config=types.GenerateContentConfig(
                    system_instruction=INSTRUCTIONS,
                    response_mime_type="application/json",
                    response_json_schema=Coaching.model_json_schema(),
                ),
            )
        except (errors.APIError, httpx.HTTPError) as e:
            raise CoachError(f"Gemini request failed: {e}") from e

        if not response.text:
            raise CoachError("Gemini returned no text")
        try:
            coaching = Coaching.model_validate_json(response.text)
        except ValidationError as e:
            raise CoachError(f"Gemini's Coaching didn't match the schema: {e}") from e
        return drop_invented_quotes(coaching, words)
