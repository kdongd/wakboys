import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/', label: '홈', end: true, icon: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /> },
  {
    to: '/trips',
    label: '에디션',
    icon: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <rect x="7.5" y="7" width="9" height="8" rx="2" />
      </>
    ),
  },
  { to: '/dues', label: '회비', icon: <><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18M16 15h2" /></> },
  { to: '/feed', label: '소식', icon: <path d="M4 5h16v11H8l-4 4z" /> },
  {
    to: '/members',
    label: '컬렉션',
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.6 2.6 3 5.2" />
      </>
    ),
  },
]

export default function Layout() {
  return (
    <>
      <Outlet />
      <nav className="tabbar">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}>
            <svg viewBox="0 0 24 24">{t.icon}</svg>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
