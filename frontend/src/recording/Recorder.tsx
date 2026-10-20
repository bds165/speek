import { CoachingNotes } from '../feedback/CoachingNotes.tsx'
import { MetricsLine } from '../feedback/MetricsLine.tsx'
import { Transcript } from '../feedback/Transcript.tsx'
import { useFeedback } from '../feedback/useFeedback.ts'
import { CAP_SECONDS, TARGET_SECONDS } from './limits.ts'
import type { RecorderState } from './useRecorder.ts'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const PRIMARY_BUTTON =
  'rounded-md bg-cue-red px-4.5 py-2.5 font-semibold text-card hover:brightness-110 disabled:opacity-50'

const TARGET_PERCENT = (TARGET_SECONDS / CAP_SECONDS) * 100

// The bar's full width is the 2:30 cap; the red tick marks the ~1:00 target.
function Timeline({ elapsed }: { elapsed: number }) {
  return (
    <div className="relative h-9">
      <div
        role="progressbar"
        aria-label="Recording time"
        aria-valuemin={0}
        aria-valuemax={CAP_SECONDS}
        aria-valuenow={elapsed}
        aria-valuetext={`${formatTime(elapsed)} of ${formatTime(CAP_SECONDS)}`}
        className="absolute inset-x-0 top-2 h-1.5 overflow-hidden rounded-full bg-line"
      >
        {/* elapsed ticks once a second; the 1s linear transition makes the fill glide between ticks. */}
        <div
          className="h-full bg-ink motion-safe:transition-[width] motion-safe:duration-1000 motion-safe:ease-linear"
          style={{ width: `${(elapsed / CAP_SECONDS) * 100}%` }}
        />
      </div>
      <div
        className="absolute top-0.5 h-4.5 w-0.5 bg-cue-red"
        style={{ left: `${TARGET_PERCENT}%` }}
      />
      <div className="absolute inset-x-0 top-5 text-xs text-ink-muted tabular-nums">
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap"
          style={{ left: `${TARGET_PERCENT}%` }}
        >
          ~{formatTime(TARGET_SECONDS)} target
        </span>
        <span className="absolute right-0">{formatTime(CAP_SECONDS)}</span>
      </div>
    </div>
  )
}

// `topic` is sent with the audio, so the Coaching is about what the Topic card showed.
// `recorder` comes from the page, which also needs its status to lock the Topic.
export function Recorder({ recorder, topic }: { recorder: RecorderState; topic: string }) {
  const { status, error, recording, elapsed, stoppedAtCap, start, stop, reset } = recorder
  const feedback = useFeedback()
  const pastTarget = elapsed >= TARGET_SECONDS
  const analysing = feedback.status === 'analysing'

  // A new Attempt never shows the previous Attempt's Feedback.
  const recordAgain = () => {
    feedback.clear()
    reset()
  }

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col gap-3.5">
        {status === 'recording' ? (
          <>
            <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
              <span className="flex items-center gap-2 font-semibold text-cue-red">
                <span className="size-2.5 rounded-full bg-cue-red motion-safe:animate-pulse" />
                Recording
              </span>
              <span className="text-section font-semibold tabular-nums">
                {formatTime(elapsed)}
              </span>
              {/* Reaching the target is said in words, not only shown on the timeline. */}
              {pastTarget && <span className="font-medium">Target reached</span>}
            </div>
            <Timeline elapsed={elapsed} />
            <div>
              <button
                onClick={stop}
                className="rounded-md bg-ink px-4.5 py-2.5 font-semibold text-card hover:brightness-125"
              >
                Stop
              </button>
            </div>
          </>
        ) : status !== 'stopped' ? (
          <div className="flex flex-wrap items-center gap-x-4.5 gap-y-3">
            <button onClick={start} disabled={status === 'requesting'} className={PRIMARY_BUTTON}>
              {status === 'requesting' ? 'Waiting for microphone…' : 'Start recording'}
            </button>
            <span className="text-ink-muted">Stops on its own at {formatTime(CAP_SECONDS)}.</span>
          </div>
        ) : null}

        {recording && (
          <>
            {stoppedAtCap && (
              <p>Recording stopped automatically at the {formatTime(CAP_SECONDS)} limit.</p>
            )}
            <audio controls src={recording.url} className="w-full" />
            <div className="flex flex-wrap items-center gap-x-4.5 gap-y-3">
              {/* Disabled while analysing, so a late response can't land on a discarded Attempt. */}
              <button
                onClick={() => feedback.request(recording.blob, topic)}
                disabled={analysing}
                className={PRIMARY_BUTTON}
              >
                {analysing ? 'Analysing…' : 'Get feedback'}
              </button>
              <button
                onClick={recordAgain}
                disabled={analysing}
                className="py-2.5 font-semibold text-mark-blue underline underline-offset-3 disabled:opacity-50"
              >
                Record again
              </button>
              <span className="text-ink-muted tabular-nums">Recorded {formatTime(elapsed)}</span>
            </div>
          </>
        )}

        {/* role="alert" so screen readers announce an error as soon as it appears. */}
        {error && (
          <p role="alert" className="rounded-md border border-cue-red bg-card px-4 py-3">
            <strong className="font-semibold text-cue-red">{error}</strong>
          </p>
        )}
        {feedback.error && (
          <p role="alert" className="rounded-md border border-cue-red bg-card px-4 py-3">
            <strong className="font-semibold text-cue-red">{feedback.error}</strong> Your
            recording is still here, so you can try Get feedback again.
          </p>
        )}
      </section>

      {feedback.feedback && (
        <div className="flex flex-col gap-3.5">
          {!feedback.feedback.enough_speech && (
            <p className="rounded-md border border-line bg-card px-4 py-3">
              We didn't catch enough speech to give feedback. Try recording again.
            </p>
          )}
          <Transcript
            words={feedback.feedback.transcript}
            pauses={feedback.feedback.metrics?.pauses}
          >
            {feedback.feedback.metrics && <MetricsLine metrics={feedback.feedback.metrics} />}
          </Transcript>
          {feedback.feedback.coaching && <CoachingNotes coaching={feedback.feedback.coaching} />}
        </div>
      )}
    </div>
  )
}
