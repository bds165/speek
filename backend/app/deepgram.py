"""Deepgram adapter: the only module that knows Deepgram's API and response format.

Calls the pre-recorded transcription REST API directly with httpx (no SDK needed).
Docs: https://developers.deepgram.com/reference/speech-to-text/listen-pre-recorded
"""

import httpx

from app.transcription import TranscriptionError, Word

URL = "https://api.deepgram.com/v1/listen"

PARAMS = {
    "model": "nova-3",
    "language": "en",
    "punctuate": "true",
    # Off by default, which would strip the "um"s and "uh"s we want to show.
    "filler_words": "true",
}

# The vocal fillers Deepgram transcribes when filler_words is on.
# "like" or "you know" come back as ordinary words (they're Verbal tics, not Fillers).
FILLERS = {"uh", "um", "mhmm", "mm-mm", "uh-uh", "uh-huh", "nuh-uh"}


class DeepgramTranscriber:
    def __init__(self, api_key: str, client: httpx.Client, timeout: float = 60.0):
        self.api_key = api_key
        self.client = client
        self.timeout = timeout

    def transcribe(self, audio: bytes, mime_type: str) -> list[Word]:
        try:
            response = self.client.post(
                URL,
                params=PARAMS,
                content=audio,
                headers={"Authorization": f"Token {self.api_key}", "Content-Type": mime_type},
                timeout=self.timeout,
            )
        except httpx.HTTPError as e:
            raise TranscriptionError(f"Could not reach Deepgram: {e}") from e

        if response.status_code != 200:
            raise TranscriptionError(f"Deepgram returned {response.status_code}")

        try:
            raw_words = response.json()["results"]["channels"][0]["alternatives"][0]["words"]
            return [
                Word(
                    # `punctuated_word` carries punctuation and capitals; `word` is lowercase.
                    text=w.get("punctuated_word") or w["word"],
                    start=w["start"],
                    end=w["end"],
                    is_filler=w["word"].lower() in FILLERS,
                )
                for w in raw_words
            ]
        except (ValueError, KeyError, IndexError, TypeError) as e:
            raise TranscriptionError(f"Unexpected Deepgram response: {e}") from e
