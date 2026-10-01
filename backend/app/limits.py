# Tunable Feedback constants, kept together so they're easy to find and adjust.
# The recording target and cap live in the frontend (src/recording/limits.ts).

# An Attempt with fewer non-Filler words than this gets no Feedback.
MIN_SPEECH_WORDS = 15

# Largest audio upload accepted. A 2:30 Opus recording is well under 1 MB.
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
