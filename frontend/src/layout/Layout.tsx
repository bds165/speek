import { Link, NavLink, Outlet } from 'react-router'

const NAV_ITEMS = [
  { to: '/about', label: 'About' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/record', label: 'Record' },
  { to: '/account', label: 'Account' },
  { to: '/login', label: 'Log in' },
]

export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-subtle bg-surface">
        <nav className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/record" className="mr-auto text-lg font-semibold">
            Speek
          </Link>
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              // NavLink passes isActive when the current URL matches `to`.
              className={({ isActive }) =>
                `border-b-2 py-1 text-sm ${
                  isActive
                    ? 'border-accent font-medium text-ink'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  )
}
