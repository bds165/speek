// Mirrors the backend's Feedback response (backend/app/feedback.py).
export type Word = { text: string; start: number; end: number; is_filler: boolean }

export type Feedback = { transcript: Word[]; enough_speech: boolean }

const UNREACHABLE = "Couldn't reach the server. Check your connection and try again."
const UNKNOWN = 'Something went wrong while analysing your recording. Please try again.'

// Uploads an Attempt's audio. Throws an Error whose message is safe to show the user.
export async function requestFeedback(audio: Blob): Promise<Feedback> {
  const form = new FormData()
  // The filename is only informative; the backend goes by the blob's MIME type.
  form.append('audio', audio, audio.type.startsWith('audio/mp4') ? 'attempt.mp4' : 'attempt.webm')

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
