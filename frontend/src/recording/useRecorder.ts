import { useCallback, useEffect, useRef, useState } from 'react'

import { CAP_SECONDS } from './limits.ts'

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error'

export type Recording = { blob: Blob; url: string }

// Chrome and Firefox record Opus in WebM; Safari only supports MP4/AAC.
// If neither is supported we let the browser choose its default.
const PREFERRED_TYPES = ['audio/webm;codecs=opus', 'audio/mp4']

function pickMimeType(): string | undefined {
  return PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
}

export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [recording, setRecording] = useState<Recording | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [stoppedAtCap, setStoppedAtCap] = useState(false)

  // Refs, not state: these are handles we need to reach from callbacks,
  // and changing them shouldn't re-render anything.
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Stopping the tracks is what turns off the browser's "mic in use" indicator.
  const releaseMic = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    clearTimer()
  }, [clearTimer])

  const start = useCallback(async () => {
    setError(null)
    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream, { mimeType: pickMimeType() })
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType })
        setRecording({ blob, url: URL.createObjectURL(blob) })
        setStatus('stopped')
        releaseMic()
      }
      recorderRef.current = recorder
      recorder.start()

      // Derive elapsed time from a start timestamp rather than counting ticks,
      // so a delayed interval (e.g. background tab) doesn't make the clock drift.
      // The same tick enforces the cap, so the stop always lines up with the clock.
      const startedAt = Date.now()
      setElapsed(0)
      timerRef.current = window.setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000)
        setElapsed(Math.min(seconds, CAP_SECONDS))
        if (seconds >= CAP_SECONDS) {
          clearTimer()
          setStoppedAtCap(true)
          recorder.stop()
        }
      }, 250)
      setStatus('recording')
    } catch (e) {
      releaseMic()
      setError(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Microphone access was denied. Allow it in your browser settings and try again.'
          : 'Could not start recording.',
      )
      setStatus('error')
    }
  }, [releaseMic, clearTimer])

  // The recording is assembled asynchronously in `onstop`. Clear the timer
  // straight away, so a tick landing before `onstop` can't hit the cap.
  const stop = useCallback(() => {
    clearTimer()
    recorderRef.current?.stop()
  }, [clearTimer])

  const reset = useCallback(() => {
    setRecording(null)
    setElapsed(0)
    setStoppedAtCap(false)
    setStatus('idle')
  }, [])

  // Free the blob's memory when it's replaced or the component goes away.
  useEffect(() => {
    return () => {
      if (recording) URL.revokeObjectURL(recording.url)
    }
  }, [recording])

  // If the component unmounts mid-recording, don't leave the mic on.
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null
        recorder.stop()
      }
      releaseMic()
    }
  }, [releaseMic])

  return { status, error, recording, elapsed, stoppedAtCap, start, stop, reset }
}
