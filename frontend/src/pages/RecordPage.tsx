import { Recorder } from '../recording/Recorder.tsx'

export function RecordPage() {
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="text-2xl font-semibold">Record</h1>
      <p className="mt-2 text-ink-muted">Speak for about a minute, then play it back.</p>
      <Recorder />
    </div>
  )
}
