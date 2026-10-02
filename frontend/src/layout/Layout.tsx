import { Link, NavLink, Outlet } from 'react-router'

// Task order; Account and Log in are quieter secondary links.
const NAV_ITEMS = [
  { to: '/record', label: 'Record', secondary: false },
  { to: '/dashboard', label: 'Dashboard', secondary: false },
  { to: '/about', label: 'About', secondary: false },
  { to: '/account', label: 'Account', secondary: true },
  { to: '/login', label: 'Log in', secondary: true },
]

export function Layout() {
  return (
    <div className="min-h-screen px-4">
      <header className="mx-auto max-w-column pt-5 pb-2">
        <nav aria-label="Main" className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5">
          <Link
            to="/record"
            // The red full stop is decoration, drawn in CSS so it isn't part of the link's name.
            className="mr-auto font-spoken text-2xl font-medium tracking-tight text-ink after:text-cue-red after:content-['.']"
          >
            Speek
          </Link>
          {NAV_ITEMS.map(({ to, label, secondary }) => (
            <NavLink
              key={to}
              to={to}
              // NavLink passes isActive when the current URL matches `to`.
              className={({ isActive }) =>
                `border-b-2 py-0.5 ${secondary ? 'font-normal' : 'font-medium'} ${
                  isActive
                    ? 'border-cue-red text-ink'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-column pt-7 pb-16">
        <Outlet />
      </main>
    </div>
  )
}
