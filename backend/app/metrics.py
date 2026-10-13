"""Metrics: the objective measurements of an Attempt, calculated from its words."""

from itertools import pairwise

from pydantic import BaseModel

from app.limits import PAUSE_SECONDS, TYPICAL_WPM_HIGH, TYPICAL_WPM_LOW
from app.transcription import Word


class WpmBand(BaseModel):
    low: int
    high: int


class Pause(BaseModel):
    after: int  # index in the transcript of the non-Filler word the Pause follows
    duration: float  # seconds


class Metrics(BaseModel):
    wpm: int
    typical_wpm: WpmBand
    filler_count: int
    pause_count: int
    # Absent when there are no Pauses.
    longest_pause: float | None = None
    pauses: list[Pause]


def count_spoken(words: list[Word]) -> int:
    return sum(1 for w in words if not w.is_filler)


def find_pauses(words: list[Word]) -> list[Pause]:
    # Only spoken words are compared, so a Filler in a silence is skipped over and the
    # silence is measured whole: from the spoken word before it to the spoken word after.
    spoken = [(i, w) for i, w in enumerate(words) if not w.is_filler]
    pauses = []
    for (i, before), (_, after) in pairwise(spoken):
        # Rounded to hundredths before comparing: timestamps are only that precise, and
        # unrounded, a gap of exactly 1.5s can come out as 1.4999999999999996 and be missed.
        gap = round(after.start - before.end, 2)
        if gap >= PAUSE_SECONDS:
            pauses.append(Pause(after=i, duration=gap))
    return pauses


def calculate_metrics(words: list[Word]) -> Metrics:
    spoken = count_spoken(words)
    # From the first word's start to the last word's end, so silence before and after doesn't
    # count. Fillers at either end are still speaking time, so they're part of the span.
    minutes = (words[-1].end - words[0].start) / 60
    pauses = find_pauses(words)
    return Metrics(
        wpm=round(spoken / minutes),
        typical_wpm=WpmBand(low=TYPICAL_WPM_LOW, high=TYPICAL_WPM_HIGH),
        filler_count=len(words) - spoken,
        pause_count=len(pauses),
        longest_pause=max((p.duration for p in pauses), default=None),
        pauses=pauses,
    )
