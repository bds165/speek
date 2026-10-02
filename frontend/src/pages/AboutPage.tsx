import { Link } from 'react-router'

export function AboutPage() {
  return (
    <div className="flex max-w-prose flex-col gap-4">
      <h1 className="text-section font-semibold tracking-tight">About Speek</h1>
      <p>
        Speek is for practising impromptu speaking. You get a topic, take a moment to prepare,
        speak for about a minute, and get specific feedback on what you said.
      </p>
      <p>
        For now you get a transcript of what you said with fillers like "um" and "uh" highlighted.
        Measurements such as your pace and pauses, and coaching on clarity, structure and wording,
        are on the way.
      </p>
      <p className="text-ink-muted">
        Speek never scores you, and it doesn't try to judge your tone of voice or how confident you
        sound.
      </p>
      <p>
        <Link to="/record" className="font-medium text-mark-blue underline underline-offset-3">
          Record your first attempt
        </Link>
      </p>
    </div>
  )
}
