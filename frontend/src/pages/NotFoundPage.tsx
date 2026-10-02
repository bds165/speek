import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-section font-semibold tracking-tight">Page not found</h1>
      <p className="text-ink-muted">There's nothing at this address. It may have moved.</p>
      <p>
        <Link to="/record" className="font-medium text-mark-blue underline underline-offset-3">
          Go to Record
        </Link>
      </p>
    </div>
  )
}
