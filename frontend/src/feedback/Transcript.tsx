import type { CSSProperties, ReactNode } from 'react'

import type { Word } from './api.ts'

// `children` sits at the foot of the card, under the words (the Metrics line).
export function Transcript({ words, children }: { words: Word[]; children?: ReactNode }) {
  // Each Filler's position among the Fillers, so the swipes draw in one after another.
  let fillerIndex = 0

  return (
    <section aria-label="Transcript" className="card card-ruled px-4.5 pt-5.5 pb-7 sm:px-7">
      <h2 className="mb-2.5 text-section font-semibold tracking-tight">What you said</h2>
      <p className="max-w-[62ch] font-spoken text-spoken">
        {words.map((word, i) => (
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
          </span>
        ))}
      </p>
      {children}
    </section>
  )
}
