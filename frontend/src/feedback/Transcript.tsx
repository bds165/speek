import type { Word } from './api.ts'

export function Transcript({ words }: { words: Word[] }) {
  return (
    <section aria-label="Transcript" className="card card-ruled w-full px-7 pt-5 pb-7 text-left">
      <h2 className="text-lg font-semibold">Transcript</h2>
      <p className="mt-2 font-spoken text-spoken">
        {words.map((word, i) => (
          // Words can repeat, and the list never reorders, so the index is a stable key.
          <span key={i}>
            {i > 0 && ' '}
            {word.is_filler ? (
              <mark className="rounded-xs bg-highlighter px-1 text-ink">{word.text}</mark>
            ) : (
              word.text
            )}
          </span>
        ))}
      </p>
    </section>
  )
}
