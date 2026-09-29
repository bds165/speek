import { useRecorder } from './useRecorder.ts'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Recorder() {
  const { status, error, recording, elapsed, start, stop, reset } = useRecorder()

  return (
    <section className="mt-8 space-y-4">
      {status === 'recording' ? (
        <div className="flex items-center gap-4">
          <button
            onClick={stop}
            className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
          >
            Stop
          </button>
          <span className="flex items-center gap-2 tabular-nums">
            <span className="size-2.5 animate-pulse rounded-full bg-red-600" />
            {formatTime(elapsed)}
          </span>
        </div>
      ) : status !== 'stopped' ? (
        <button
          onClick={start}
          disabled={status === 'requesting'}
          className="rounded-lg bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {status === 'requesting' ? 'Waiting for microphone…' : 'Start recording'}
        </button>
      ) : null}

      {recording && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Recorded {formatTime(elapsed)}</p>
          <audio controls src={recording.url} className="w-full" />
          <button onClick={reset} className="text-sm font-medium underline">
            Record again
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  )
}
