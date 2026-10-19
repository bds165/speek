import { Recorder } from '../recording/Recorder.tsx'
import { useRecorder } from '../recording/useRecorder.ts'
import { useTopic } from '../topic/useTopic.ts'

export function RecordPage() {
  // The recorder lives here, not in <Recorder>, because the Topic card needs its status too.
  const recorder = useRecorder()
  const { topic, flickingTopic, shuffle } = useTopic()
  // The Topic belongs to the Attempt: it can change only before recording starts.
  const canShuffle = recorder.status === 'idle' || recorder.status === 'error'
  // Once recording starts, any riffle still running is ignored: the card shows the dealt Topic.
  const shown = (canShuffle && flickingTopic) || topic

  return (
    <div className="flex flex-col gap-7">
      {/* The prompt is the page's heading: it's the first thing the speaker needs. */}
      <section
        aria-label="Topic"
        className="card card-ruled px-4.5 pt-4.5 pb-5.5 sm:px-7 sm:pt-5.5 sm:pb-7"
      >
        <div className="mb-1.5 flex items-baseline justify-between gap-4">
          <p className="text-sm text-ink-muted">Your topic</p>
          {canShuffle && (
            <button
              onClick={shuffle}
              className="text-sm font-semibold text-mark-blue underline underline-offset-3"
            >
              Shuffle
            </button>
          )}
        </div>
        {/* aria-live announces a newly dealt Topic. Screen readers get only the dealt Topic
            (sr-only); what's on screen, including Topics flicking past, is hidden from them.
            Both spans are always there, so the live region changes once per Shuffle. */}
        <h1
          aria-live="polite"
          className="max-w-[22ch] font-spoken text-3xl tracking-tight text-balance sm:text-topic"
        >
          <span className="sr-only">{topic}</span>
          {/* A new key per flick restarts the animation. */}
          <span
            key={shown}
            aria-hidden="true"
            className={canShuffle && flickingTopic ? 'riffle-flick' : undefined}
          >
            {shown}
          </span>
        </h1>
        <p className="mt-4.5 leading-8 text-ink-muted">
          Take a moment to think, then start when you're ready. Aim for about a minute.
        </p>
      </section>
      <Recorder recorder={recorder} topic={topic} />
    </div>
  )
}
