import { Recorder } from '../recording/Recorder.tsx'

export function RecordPage() {
  return (
    <div className="flex flex-col gap-7">
      {/* The prompt is the page's heading: it's the first thing the speaker needs. */}
      <section
        aria-label="Topic"
        className="card card-ruled px-4.5 pt-4.5 pb-5.5 sm:px-7 sm:pt-5.5 sm:pb-7"
      >
        <p className="mb-1.5 text-sm text-ink-muted">Your topic</p>
        <h1 className="max-w-[22ch] font-spoken text-3xl tracking-tight text-balance sm:text-topic">
          Pick something you know well and talk about it for a minute.
        </h1>
        <p className="mt-4.5 leading-8 text-ink-muted">
          Take a moment to think, then start when you're ready. Aim for about a minute.
        </p>
      </section>
      {/* A Shuffle button for the Topic will sit here later. */}
      <Recorder />
    </div>
  )
}
