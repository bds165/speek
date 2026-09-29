import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2">
        <Link to="/record" className="text-accent-strong underline">
          Go to Record
        </Link>
      </p>
    </div>
  )
}
