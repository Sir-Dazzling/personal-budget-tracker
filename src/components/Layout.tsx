import { NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const links = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/add', label: 'Add', icon: '+' },
  { to: '/dashboard', label: 'Stats', icon: '◉' },
  { to: '/history', label: 'History', icon: '☰' },
  { to: '/budget', label: 'Budget', icon: '₦' },
]

export function Layout() {
  const { cloud, household } = useApp()

  return (
    <>
      <div className="app-shell">
        <div className="row space-between" style={{ marginBottom: 18 }}>
          <div className="brand-mark">Split</div>
          <div className="row" style={{ gap: 8 }}>
            <span className={`mode-pill ${cloud ? 'cloud' : ''}`}>
              {cloud ? 'Synced' : 'This device'}
            </span>
            {household && (
              <span className="badge" title="Join code">
                {household.join_code}
              </span>
            )}
          </div>
        </div>
        <Outlet />
      </div>
      <nav className="nav" aria-label="Main">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'}>
            <span className="icon" aria-hidden>
              {l.icon}
            </span>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
