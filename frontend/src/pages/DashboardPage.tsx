import { Link } from 'react-router'

// Placeholders until sessions are stored; definitions are decided once real data exists.
const OVERVIEW = ['Current streak', 'Sessions', 'Days practised']

const COLUMNS = ['Date', 'Prompt', 'Time', 'WPM', 'Fillers']

export function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {OVERVIEW.map((label) => (
          <div key={label} className="rounded-lg bg-surface p-4">
            <p className="text-sm text-ink-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold">—</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">History</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface">
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col} className="px-3 py-2 font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-ink-muted">
                  No sessions yet.{' '}
                  <Link to="/record" className="text-accent-strong underline">
                    Record your first one
                  </Link>
                  .
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
