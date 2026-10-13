import type { Coaching, Improvement } from './api.ts'

const HEADING = 'mb-2 text-lg font-semibold tracking-tight'

function ImprovementNote({ improvement }: { improvement: Improvement }) {
  const { category, quote, explanation, suggestion } = improvement
  return (
    // A thin rule on the left groups each improvement, rather than a card around it.
    <li className="flex flex-col gap-1 border-l-2 border-line pl-4">
      <span className="text-sm text-ink-muted">{category}</span>
      {/* The user's own words, so in the spoken face. */}
      <p className="font-spoken italic">“{quote}”</p>
      <p>{explanation}</p>
      {suggestion && (
        <p>
          <span className="font-semibold text-mark-blue">Try:</span> {suggestion}
        </p>
      )}
    </li>
  )
}

// Below the transcript card, on the desk. Only the next step gets a card: it's the one thing
// to remember. No score and no verdict colours: the words do the coaching.
export function CoachingNotes({ coaching }: { coaching: Coaching }) {
  return (
    <section aria-label="Coaching" className="mt-3.5 flex flex-col gap-7">
      <div>
        <h2 id="coaching-worked" className={HEADING}>
          What worked
        </h2>
        <ul aria-labelledby="coaching-worked" className="list-disc space-y-1 pl-5">
          {coaching.strengths.map((strength, i) => (
            <li key={i}>{strength}</li>
          ))}
        </ul>
      </div>

      {coaching.improvements.length > 0 && (
        <div>
          <h2 id="coaching-work-on" className={HEADING}>
            What to work on
          </h2>
          <ul aria-labelledby="coaching-work-on" className="flex flex-col gap-5">
            {coaching.improvements.map((improvement, i) => (
              <ImprovementNote key={i} improvement={improvement} />
            ))}
          </ul>
        </div>
      )}

      <section aria-labelledby="coaching-next" className="card px-4.5 pt-4.5 pb-5.5 sm:px-7">
        <h2 id="coaching-next" className={HEADING}>
          Next time
        </h2>
        <p className="font-spoken text-spoken">{coaching.next_step}</p>
      </section>
    </section>
  )
}
