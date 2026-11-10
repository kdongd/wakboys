import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { img } from '../members'
import type { Member } from '../types'
import { cx } from '../util'

export function Spinner({ full }: { full?: boolean }) {
  return full ? (
    <div className="spinner-full">
      <div className="spinner" />
    </div>
  ) : (
    <div className="spinner" />
  )
}

const EMPTY_FACES = ['kimdaehee', 'jangikjun', 'choiseungbin', 'kimchanghyun', 'chohyunjun', 'parkminhoon']

export function Empty({ children, slug }: { children: ReactNode; slug?: string }) {
  const s = slug ?? EMPTY_FACES[(typeof children === 'string' ? children.length : 3) % EMPTY_FACES.length]
  return (
    <div className="empty">
      <img src={img.reaction(s, 'surprised')} alt="" />
      {children}
    </div>
  )
}

export function Avatar({ m, size = 40, ring = true, gray, onClick }: {
  m: Pick<Member, 'slug' | 'themeColor' | 'name'>
  size?: number
  ring?: boolean
  gray?: boolean
  onClick?: () => void
}) {
  return (
    <img
      className={cx('avatar', gray && 'gray')}
      src={img.profile(m.slug)}
      alt={m.name}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        boxShadow: ring ? `0 0 0 ${size > 36 ? 3 : 2}px ${gray ? '#d5cfc4' : m.themeColor}` : undefined,
        cursor: onClick ? 'pointer' : undefined,
      }}
    />
  )
}

export function Name({ m }: { m: Member }) {
  return (
    <span className="bold">
      {m.name}
      {m.treasurer && <span className="badge">총무</span>}
    </span>
  )
}

export function Back({ to, label }: { to?: string; label: string }) {
  const nav = useNavigate()
  return (
    <button className="back" onClick={() => (to ? nav(to) : window.history.length > 1 ? nav(-1) : nav('/'))}>
      ‹ {label}
    </button>
  )
}

export function Sheet({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
  if (!open) return null
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  )
}

export function Bar({ value, total, color }: { value: number; total: number; color?: string }) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((value / total) * 100))
  return (
    <div className="bar">
      <div style={{ width: pct + '%', background: color }} />
    </div>
  )
}

export function confirmAsk(message: string) {
  return window.confirm(message)
}
