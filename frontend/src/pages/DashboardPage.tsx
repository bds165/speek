import { Link } from 'react-router'

// Placeholders until Attempts are stored; definitions are decided once real data exists.
const OVERVIEW = ['Current streak', 'Attempts', 'Days practised']

const COLUMNS = ['Date', 'Topic', 'Time', 'WPM', 'Fillers']

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-section font-semibold tracking-tight">Dashboard</h1>
        {/* A quiet row of figures, not big-number tiles. */}
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
          {OVERVIEW.map((label) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <dt className="order-2 text-ink-muted">{label}</dt>
              <dd className="order-1 font-semibold tabular-nums">—</dd>
            </div>
          ))}
        </dl>
      </div>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="text-lg font-semibold">
          History
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left tabular-nums">
            <thead className="border-b border-line">
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col} className="px-3 py-2 font-medium text-ink-muted first:pl-0">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={COLUMNS.length} className="py-8">
                  No attempts yet.{' '}
                  <Link to="/record" className="text-mark-blue underline underline-offset-3">
                    Record your first attempt
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
