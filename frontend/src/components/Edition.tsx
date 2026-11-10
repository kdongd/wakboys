import { Link } from 'react-router-dom'
import { img, LINEUP } from '../members'
import type { Trip } from '../types'
import { ddayLabel, range, seasonColors, seasonEn } from '../util'

/** relative figure heights so everyone stands at their own size */
const HEIGHT: Record<string, number> = {
  kimdonguk: 100, leejaeho: 97, chohyunjun: 103, parkminhoon: 100,
  choiseungbin: 94, kimchanghyun: 105, kimdaehee: 97, jangikjun: 91,
}
const CENTER = LINEUP.indexOf('kimdonguk')

export function Lineup({ scale = 1 }: { scale?: number }) {
  return (
    <div className="lineup">
      {LINEUP.map((s, i) => (
        <img
          key={s}
          src={img.full(s)}
          alt=""
          style={{
            height: HEIGHT[s] * scale,
            margin: `0 ${-8 * scale}px`,
            position: 'relative',
            zIndex: i === CENTER ? 10 : 9 - Math.abs(i - CENTER),
          }}
        />
      ))}
    </div>
  )
}

/** The big "2026 WINTER EDITION" box used on home and in the trip header. */
export function EditionBox({ trip, footer, height = 250 }: { trip: Trip; footer?: React.ReactNode; height?: number }) {
  const c = seasonColors(trip.season)
  return (
    <div className="box" style={{ height, background: `linear-gradient(160deg, ${c.from}, ${c.to})` }}>
      <div style={{ position: 'absolute', top: 14, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 4 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', opacity: 0.85 }}>
            LIMITED · SERIES {String(trip.edition).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 23, fontWeight: 900, lineHeight: 1.05, marginTop: 3 }}>
            {trip.year}
            <br />
            {seasonEn(trip.season)} EDITION
          </div>
        </div>
        <div className="d-badge">{ddayLabel(trip.dday, trip.status)}</div>
      </div>
      <div className="window" style={{ left: 16, right: 16, bottom: 44, height: height - 140 }}>
        <Lineup scale={(height - 140) / 118} />
        <div className="gloss" />
      </div>
      <div style={{ position: 'absolute', bottom: 13, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, opacity: 0.95, gap: 8 }}>
        {footer ?? (
          <>
            <span className="ellipsis">{trip.destination ?? trip.title} · {range(trip.startDate, trip.endDate)}</span>
            <span style={{ whiteSpace: 'nowrap' }}>8 FIGURES INCLUDED</span>
          </>
        )}
      </div>
    </div>
  )
}

/** Small box on the 진열장 shelf. Shows a photo from that trip when there is one. */
export function MiniBox({ trip, faceSlug, link = true }: { trip: Trip; faceSlug?: string; link?: boolean }) {
  const c = seasonColors(trip.season)
  const cover = trip.coverThumbs[0]
  const style = { background: `linear-gradient(160deg, ${c.from}, ${c.to})` }
  const inner = (
    <>
      <div className="lbl">
        {trip.year}
        <br />
        {seasonEn(trip.season)}
      </div>
      <div className="window">
        {cover ? (
          <img src={cover} alt="" />
        ) : (
          <img src={img.reaction(faceSlug ?? LINEUP[trip.edition % 8], 'happy')} alt="" style={{ objectFit: 'cover', objectPosition: 'top' }} />
        )}
        <div className="gloss" />
      </div>
    </>
  )
  return link ? (
    <Link to={`/trips/${trip.id}`} className="mini-box" style={style}>{inner}</Link>
  ) : (
    <div className="mini-box" style={style}>{inner}</div>
  )
}
