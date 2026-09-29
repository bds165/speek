export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-ink-muted">Coming soon.</p>
    </div>
  )
}
