// Mirrors the backend's Feedback response (backend/app/feedback.py).
export type Word = { text: string; start: number; end: number; is_filler: boolean }

export type WpmBand = { low: number; high: number }

// `after` is the transcript index of the non-Filler word the Pause follows.
export type Pause = { after: number; duration: number }

export type Metrics = {
  wpm: number
  typical_wpm: WpmBand
  filler_count: number
  pause_count: number
  // Absent when there are no Pauses.
  longest_pause?: number
  pauses: Pause[]
}

export type Improvement = {
  category: string
  quote: string // the user's own words, from the transcript
  explanation: string
  suggestion?: string
}

// No score, on purpose.
export type Coaching = { strengths: string[]; improvements: Improvement[]; next_step: string }

// `metrics` and `coaching` are absent when there wasn't enough speech.
export type Feedback = {
  transcript: Word[]
  enough_speech: boolean
  metrics?: Metrics
  coaching?: Coaching
}

const UNREACHABLE = "Couldn't reach the server. Check your connection and try again."
const UNKNOWN = 'Something went wrong while analysing your recording. Please try again.'

// Uploads an Attempt's audio and its Topic. Throws an Error whose message is safe to show the user.
export async function requestFeedback(audio: Blob, topic: string): Promise<Feedback> {
  const form = new FormData()
  // The filename is only informative; the backend goes by the blob's MIME type.
  form.append('audio', audio, audio.type.startsWith('audio/mp4') ? 'attempt.mp4' : 'attempt.webm')
  form.append('topic', topic)

  let response: Response
  try {
    response = await fetch('/api/feedback', { method: 'POST', body: form })
  } catch {
    throw new Error(UNREACHABLE)
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    // FastAPI puts the user-facing message in `detail` (a string for our own errors).
    throw new Error(typeof body?.detail === 'string' ? body.detail : UNKNOWN)
  }
  if (!body) throw new Error(UNKNOWN)
  return body as Feedback
}
