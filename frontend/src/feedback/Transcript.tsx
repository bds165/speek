import type { CSSProperties, ReactNode } from 'react'

import type { Pause, Word } from './api.ts'
import { formatSeconds } from './formatSeconds.ts'

// A breath mark, the "//" speakers write in a script for "pause here", with the Pause's length.
function PauseMark({ duration }: { duration: number }) {
  const seconds = formatSeconds(duration)
  return (
    // role="img" makes screen readers say the label instead of "slash slash 2.1 s".
    <span
      role="img"
      aria-label={`pause, ${seconds} seconds`}
      className="font-ui text-[13px] font-semibold whitespace-nowrap text-mark-blue tabular-nums"
    >
      //{seconds}s
    </span>
  )
}

// `children` sits at the foot of the card, under the words (the Metrics line).
export function Transcript({
  words,
  pauses = [],
  children,
}: {
  words: Word[]
  pauses?: Pause[]
  children?: ReactNode
}) {
  // Each Filler's position among the Fillers, so the swipes draw in one after another.
  let fillerIndex = 0
  const pauseAfter = new Map(pauses.map((p) => [p.after, p.duration]))

  return (
    <section aria-label="Transcript" className="card card-ruled px-4.5 pt-5.5 pb-7 sm:px-7">
      <h2 className="mb-2.5 text-section font-semibold tracking-tight">What you said</h2>
      <p className="max-w-[62ch] font-spoken text-spoken">
        {words.map((word, i) => {
          const pause = pauseAfter.get(i)
          return (
            // Words can repeat, and the list never reorders, so the index is a stable key.
            <span key={i}>
              {i > 0 && ' '}
              {word.is_filler ? (
                <mark
                  className="highlighter-swipe"
                  style={{ '--filler-index': fillerIndex++ } as CSSProperties}
                >
                  {word.text}
                </mark>
              ) : (
                word.text
              )}
              {pause !== undefined && (
                <>
                  {/* A non-breaking space, so a mark never starts a line on its own. */}
                  &nbsp;
                  <PauseMark duration={pause} />
                </>
              )}
            </span>
          )
        })}
      </p>
      {children}
    </section>
  )
}
