"""Compare Filler recall across Deepgram settings on your own clips (issue #7).

Run from backend/:  .venv/Scripts/python scripts/compare_fillers.py
Needs DEEPGRAM_API_KEY in .env, clips in tests/fixtures/ (named *.local.*, so git-ignored),
and tests/fixtures/fillers.local.json listing how many Fillers you actually spoke:

    [
      {"file": "fillers-01.local.webm", "spoken": 3, "note": "held uhhh at start"},
      {"file": "fillers-02.local.webm", "spoken": 2}
    ]

Each clip goes to every setting in VARIANTS (one paid Deepgram call each). It prints
every transcript with detected Fillers in [brackets], so you can check they're the ones
you said, then a Markdown table to paste into the issue.
"""

import json
import sys
from dataclasses import dataclass
from pathlib import Path

import httpx

# Run as a plain script, so make `app` importable from backend/.
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.coaching import marked_transcript
from app.config import settings
from app.deepgram import PARAMS, DeepgramTranscriber
from app.metrics import calculate_metrics

FIXTURES = Path(__file__).parent.parent / "tests" / "fixtures"
MANIFEST = FIXTURES / "fillers.local.json"

VARIANTS = {
    "nova-2 (current)": PARAMS,
    "nova-3": {**PARAMS, "model": "nova-3"},
    # Keyterm prompting (Nova-3 only) nudges the model towards these words.
    "nova-3 + keyterms": {**PARAMS, "model": "nova-3", "keyterm": ["um", "uh"]},
    # Keyword boosting is Nova-2's older equivalent; ":2" is the boost strength.
    "nova-2 + keywords": {**PARAMS, "keywords": ["um:2", "uh:2"]},
}

MIME_TYPES = {
    ".webm": "audio/webm",
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
}


@dataclass
class Clip:
    file: str
    spoken: int  # Fillers you actually said, counted by listening back
    note: str = ""


def recall(clips: list[Clip], detected: dict[str, int]) -> float | None:
    """Share of spoken Fillers that were detected. Per clip, extra detections beyond what
    was spoken don't make up for misses elsewhere."""
    spoken = sum(c.spoken for c in clips)
    if spoken == 0:
        return None
    return sum(min(detected[c.file], c.spoken) for c in clips) / spoken


def markdown_table(clips: list[Clip], detected: dict[str, dict[str, int]]) -> str:
    """`detected` maps variant name -> clip file -> Filler count."""
    variants = list(detected)
    rows = [
        "| Clip | Spoken | " + " | ".join(variants) + " |",
        "|---" * (len(variants) + 2) + "|",
    ]
    for c in clips:
        name = f"{c.file} ({c.note})" if c.note else c.file
        counts = " | ".join(str(detected[v][c.file]) for v in variants)
        rows.append(f"| {name} | {c.spoken} | {counts} |")
    recalls = [recall(clips, detected[v]) for v in variants]
    rows.append(
        "| **Recall** | | " + " | ".join("n/a" if r is None else f"{r:.0%}" for r in recalls) + " |"
    )
    return "\n".join(rows)


def main() -> None:
    if not settings.deepgram_api_key:
        sys.exit("DEEPGRAM_API_KEY is not set in .env")
    if not MANIFEST.exists():
        sys.exit(f"No manifest at {MANIFEST}; see the docstring at the top of this script.")
    clips = [
        Clip(c["file"], c["spoken"], c.get("note", "")) for c in json.loads(MANIFEST.read_text())
    ]
    # Check every clip before the first paid call, rather than failing halfway through.
    for clip in clips:
        path = FIXTURES / clip.file
        if not path.exists():
            sys.exit(f"Clip not found: {path}")
        if path.suffix not in MIME_TYPES:
            sys.exit(f"Unknown audio type {path.suffix!r}; expected one of {', '.join(MIME_TYPES)}")

    detected: dict[str, dict[str, int]] = {v: {} for v in VARIANTS}
    with httpx.Client() as client:
        for clip in clips:
            path = FIXTURES / clip.file
            audio = path.read_bytes()
            print(f"\n## {clip.file}: {clip.spoken} spoken")
            for name, params in VARIANTS.items():
                transcriber = DeepgramTranscriber(settings.deepgram_api_key, client, params=params)
                words = transcriber.transcribe(audio, MIME_TYPES[path.suffix])
                # The app's own Metrics, so we measure the count the app will rely on.
                metrics = calculate_metrics(words)
                detected[name][clip.file] = metrics.filler_count
                print(f"- {name} ({metrics.filler_count}): {marked_transcript(words, metrics)}")

    print("\n" + markdown_table(clips, detected))


if __name__ == "__main__":
    main()
