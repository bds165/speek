import type { Metrics } from './api.ts'
import { formatSeconds } from './formatSeconds.ts'

// One quiet line, not stat tiles. The figures are emphasised by weight only: no colour,
// and no wording that says whether a number is good or bad.
export function MetricsLine({ metrics }: { metrics: Metrics }) {
  const { wpm, typical_wpm, filler_count, pause_count, longest_pause } = metrics
  return (
    <section aria-label="Metrics" className="mt-6 border-t border-line pt-3.5 text-ink-muted">
      <p className="tabular-nums">
        <strong className="font-semibold text-ink">{wpm}</strong> words a minute (typical ~
        {typical_wpm.low}–{typical_wpm.high}) ·{' '}
        <strong className="font-semibold text-ink">{filler_count}</strong>{' '}
        {filler_count === 1 ? 'filler' : 'fillers'} ·{' '}
        <strong className="font-semibold text-ink">{pause_count}</strong>{' '}
        {pause_count === 1 ? 'pause' : 'pauses'}
        {longest_pause !== undefined && `, longest ${formatSeconds(longest_pause)}s`}
      </p>
    </section>
  )
}
