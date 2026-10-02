import { Link } from 'react-router'

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-section font-semibold tracking-tight">{title}</h1>
      <p className="text-ink-muted">Coming soon. You can practise without an account for now.</p>
      <p>
        <Link to="/record" className="font-medium text-mark-blue underline underline-offset-3">
          Record an attempt
        </Link>
      </p>
    </div>
  )
}
