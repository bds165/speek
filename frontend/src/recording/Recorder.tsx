import { Transcript } from '../feedback/Transcript.tsx'
import { useFeedback } from '../feedback/useFeedback.ts'
import { CAP_SECONDS, TARGET_SECONDS } from './limits.ts'
import { useRecorder } from './useRecorder.ts'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Recorder() {
  const { status, error, recording, elapsed, stoppedAtCap, start, stop, reset } = useRecorder()
  const feedback = useFeedback()
  const pastTarget = elapsed >= TARGET_SECONDS
  const analysing = feedback.status === 'analysing'

  // A new Attempt never shows the previous Attempt's Feedback.
  const recordAgain = () => {
    feedback.clear()
    reset()
  }

  return (
    <section className="mt-8 flex w-full max-w-md flex-col items-center gap-4">
      {status === 'recording' ? (
        <div className="flex items-center gap-4">
          <button
            onClick={stop}
            className="rounded-lg bg-danger px-4 py-2 font-medium text-white hover:brightness-110"
          >
            Stop
          </button>
          <span className="flex items-center gap-2 tabular-nums">
            <span className="size-2.5 animate-pulse rounded-full bg-danger" />
            {pastTarget ? (
              <>
                <span className="font-semibold text-accent-strong">{formatTime(elapsed)}</span>
                <span className="text-sm text-accent-strong">Target reached</span>
              </>
            ) : (
              <>
                <span>{formatTime(elapsed)}</span>
                <span className="text-sm text-ink-muted">
                  / ~{formatTime(TARGET_SECONDS)} target
                </span>
              </>
            )}
          </span>
        </div>
      ) : status !== 'stopped' ? (
        <button
          onClick={start}
          disabled={status === 'requesting'}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-ink hover:brightness-95 disabled:opacity-50"
        >
          {status === 'requesting' ? 'Waiting for microphone…' : 'Start recording'}
        </button>
      ) : null}

      {recording && (
        <div className="flex w-full flex-col items-center gap-3">
          <p className="text-sm text-ink-muted">Recorded {formatTime(elapsed)}</p>
          {stoppedAtCap && (
            <p className="text-sm text-ink">
              Recording stopped automatically at the {formatTime(CAP_SECONDS)} limit.
            </p>
          )}
          <audio controls src={recording.url} className="w-full" />
          <div className="flex items-center gap-4">
            {/* Disabled while analysing, so a late response can't land on a discarded Attempt. */}
            <button
              onClick={() => feedback.request(recording.blob)}
              disabled={analysing}
              className="rounded-lg bg-accent px-4 py-2 font-medium text-ink hover:brightness-95 disabled:opacity-50"
            >
              {analysing ? 'Analysing…' : 'Get feedback'}
            </button>
            <button
              onClick={recordAgain}
              disabled={analysing}
              className="text-sm font-medium text-accent-strong underline disabled:opacity-50"
            >
              Record again
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {feedback.error && <p className="text-sm text-danger">{feedback.error}</p>}

      {feedback.feedback && (
        <div className="mt-4 flex w-full flex-col gap-3">
          {!feedback.feedback.enough_speech && (
            <p className="text-ink">
              We didn't catch enough speech to give feedback. Try recording again.
            </p>
          )}
          <Transcript words={feedback.feedback.transcript} />
        </div>
      )}
    </section>
  )
}
