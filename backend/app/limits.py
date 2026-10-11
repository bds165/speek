# Tunable Feedback constants, kept together so they're easy to find and adjust.
# The recording target and cap live in the frontend (src/recording/limits.ts).

# An Attempt with fewer non-Filler words than this gets no Feedback.
MIN_SPEECH_WORDS = 15

# The neutral reference band shown next to WPM. A commonly quoted range for English speech,
# not a target.
TYPICAL_WPM_LOW = 120
TYPICAL_WPM_HIGH = 160

# A silence between two non-Filler words at least this long (in seconds) is a Pause.
# Fillers inside the silence don't split it.
PAUSE_SECONDS = 1.5

# Largest audio upload accepted. A 2:30 Opus recording is well under 1 MB.
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
