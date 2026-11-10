import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/', label: '홈', end: true, icon: '🏠' },
  { to: '/trips', label: '모임', icon: '🧳' },
  { to: '/feed', label: '소식', icon: '💬' },
  { to: '/members', label: '컬렉션', icon: '⭐' },
  { to: '/me', label: '내정보', icon: '🙋' },
]

export default function Layout() {
  return (
    <>
      <Outlet />
      <nav className="tabbar">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}>
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
