import type { Word } from './api.ts'

export function Transcript({ words }: { words: Word[] }) {
  return (
    <section aria-label="Transcript" className="w-full text-left">
      <h2 className="text-lg font-semibold">Transcript</h2>
      <p className="mt-2 leading-relaxed">
        {words.map((word, i) => (
          // Words can repeat, and the list never reorders, so the index is a stable key.
          <span key={i}>
            {i > 0 && ' '}
            {word.is_filler ? (
              <mark className="rounded bg-accent/35 px-1 text-ink">{word.text}</mark>
            ) : (
              word.text
            )}
          </span>
        ))}
      </p>
    </section>
  )
}
