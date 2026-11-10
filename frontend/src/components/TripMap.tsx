import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { KOREA_PATH, KOREA_VIEWBOX, project } from '../koreaMap'
import { guessPlace } from '../places'
import type { Trip } from '../types'
import { range, seasonKo } from '../util'

type Spot = { key: string; x: number; y: number; label: string; trips: Trip[] }

/** Where a trip goes on the map: saved coordinates first, otherwise guessed from the 여행지 text. */
export function tripPoint(t: Trip) {
  if (t.lat != null && t.lng != null) {
    return { lat: t.lat, lng: t.lng, label: t.destination ?? t.title }
  }
  const p = guessPlace(t.destination, t.title)
  return p ? { lat: p.lat, lng: p.lng, label: p.name } : null
}

/** Illustrated map of Korea with a pin for every trip, grouped when places overlap. */
export default function TripMap({ trips }: { trips: Trip[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  const { spots, missing } = useMemo(() => {
    const groups = new Map<string, Spot>()
    let missing = 0
    for (const t of trips) {
      const pt = tripPoint(t)
      if (!pt) {
        missing++
        continue
      }
      const { x, y } = project(pt.lat, pt.lng)
      // merge pins closer than ~12 units so they don't stack on top of each other
      const near = [...groups.values()].find((g) => Math.hypot(g.x - x, g.y - y) < 12)
      if (near) near.trips.push(t)
      else groups.set(`${x.toFixed(0)}:${y.toFixed(0)}`, { key: `${x.toFixed(0)}:${y.toFixed(0)}`, x, y, label: pt.label, trips: [t] })
    }
    return { spots: [...groups.values()].sort((a, b) => a.y - b.y), missing }
  }, [trips])

  const active = spots.find((s) => s.key === selected) ?? null
  const visited = spots.length

  return (
    <div className="card trip-map">
      <div className="card-h">
        <span>🗺️ 우리가 다녀온 곳</span>
        <small>{visited}곳</small>
      </div>
      <div className="map-frame">
        <svg viewBox={`0 -55 ${KOREA_VIEWBOX.w} ${KOREA_VIEWBOX.h + 55}`} className="map-svg" onClick={() => setSelected(null)}>
          <defs>
            <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b6ee98" />
              <stop offset="1" stopColor="#82d468" />
            </linearGradient>
          </defs>
          <path d={KOREA_PATH} fill="#6fc35a" transform="translate(0 6)" opacity="0.55" />
          <path d={KOREA_PATH} fill="url(#land)" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
          {spots.map((s) => {
            const season = s.trips[s.trips.length - 1].season
            const color = season === 'SUMMER' ? '#ff8a5c' : '#6a86f5'
            const on = s.key === selected
            return (
              <g
                key={s.key}
                transform={`translate(${s.x} ${s.y})`}
                className="map-pin"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelected(on ? null : s.key)
                }}
              >
                <ellipse cx="0" cy="3" rx="12" ry="4.5" fill="rgba(0,0,0,.18)" />
                <path
                  d="M0 0 C -6 -10 -16 -16 -16 -28 A 16 16 0 1 1 16 -28 C 16 -16 6 -10 0 0 Z"
                  fill={color}
                  stroke="#fff"
                  strokeWidth={on ? 4 : 3}
                  transform={on ? 'scale(1.7)' : 'scale(1.4)'}
                />
                <text x="0" y={on ? -41 : -33} textAnchor="middle" fontSize={on ? 24 : 20} fontWeight="900" fill="#fff">
                  {s.trips.length > 1 ? s.trips.length : season === 'SUMMER' ? '☀' : '❄'}
                </text>
                <text x="0" y="30" textAnchor="middle" className="map-label">{s.label}</text>
              </g>
            )
          })}
        </svg>
      </div>
      {active ? (
        <div className="stack mt8" style={{ gap: 6 }}>
          {active.trips.map((t) => (
            <Link key={t.id} to={`/trips/${t.id}`} className="map-trip">
              <span style={{ fontSize: 22 }}>{t.season === 'SUMMER' ? '🏖️' : '⛄'}</span>
              <span className="grow">
                <span className="bold" style={{ display: 'block' }}>{t.title}</span>
                <span className="small muted bold">{t.year} {seasonKo(t.season)} · {range(t.startDate, t.endDate)}</span>
              </span>
              <span className="bold" style={{ color: 'var(--purple)' }}>›</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="small muted bold center mt8">
          {visited === 0 ? '여행지를 등록하면 지도에 핀이 꽂혀요' : '핀을 누르면 그때 여행을 볼 수 있어요'}
          {missing > 0 && ` · 위치 미등록 ${missing}개`}
        </div>
      )}
    </div>
  )
}
