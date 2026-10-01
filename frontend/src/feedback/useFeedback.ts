import { useCallback, useState } from 'react'

import { type Feedback, requestFeedback } from './api.ts'

export type FeedbackStatus = 'idle' | 'analysing' | 'done' | 'error'

export function useFeedback() {
  const [status, setStatus] = useState<FeedbackStatus>('idle')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [error, setError] = useState<string | null>(null)

  const request = useCallback(async (audio: Blob) => {
    setStatus('analysing')
    setError(null)
    try {
      setFeedback(await requestFeedback(audio))
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }, [])

  const clear = useCallback(() => {
    setStatus('idle')
    setFeedback(null)
    setError(null)
  }, [])

  return { status, feedback, error, request, clear }
}
