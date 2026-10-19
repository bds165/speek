"""Scoring for the Filler-detection comparison script (#7); no network involved."""

from app.transcription import Word
from scripts.compare_fillers import Clip, count_fillers, markdown_table, recall


def word(text, is_filler=False):
    return Word(text=text, start=0.0, end=0.1, is_filler=is_filler)


def test_counts_only_fillers():
    words = [word("I,"), word("uh,", True), word("graduate"), word("Um,", True)]
    assert count_fillers(words) == 2


def test_recall_does_not_reward_extra_detections():
    clips = [Clip("a.local.webm", spoken=4), Clip("b.local.webm", spoken=2)]
    # 3 of 4 on clip a; 5 "detected" on clip b counts as only the 2 spoken.
    assert recall(clips, {"a.local.webm": 3, "b.local.webm": 5}) == 5 / 6


def test_recall_with_no_spoken_fillers_is_none():
    assert recall([Clip("a.local.webm", spoken=0)], {"a.local.webm": 1}) is None


def test_markdown_table_has_a_row_per_clip_and_a_recall_row():
    clips = [Clip("a.local.webm", spoken=4, note="held uhhh"), Clip("b.local.webm", spoken=2)]
    detected = {
        "nova-2": {"a.local.webm": 4, "b.local.webm": 2},
        "nova-3": {"a.local.webm": 1, "b.local.webm": 2},
    }

    assert markdown_table(clips, detected).splitlines() == [
        "| Clip | Spoken | nova-2 | nova-3 |",
        "|---|---|---|---|",
        "| a.local.webm (held uhhh) | 4 | 4 | 1 |",
        "| b.local.webm | 2 | 2 | 2 |",
        "| **Recall** | | 100% | 50% |",
    ]
