import type { ReactNode } from 'react'
import { img, LINEUP } from '../members'

/** Chunky sticker-style wordmark with a star. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="logo" style={{ fontSize: size }}>
      <span className="logo-star" style={{ fontSize: size * 0.8 }}>⭐</span>
      <span className="logo-text">WAKBOYS</span>
    </div>
  )
}

/** A few soft clouds floating in the background of a sky area. */
export function Clouds() {
  return (
    <>
      <span className="cloud" style={{ top: 22, left: -18, transform: 'scale(.9)' }} />
      <span className="cloud" style={{ top: 64, right: -10, transform: 'scale(1.15)' }} />
      <span className="cloud" style={{ top: 12, right: 120, transform: 'scale(.6)', opacity: 0.8 }} />
    </>
  )
}

const HEIGHT: Record<string, number> = {
  kimdonguk: 100, leejaeho: 97, chohyunjun: 103, parkminhoon: 100,
  choiseungbin: 94, kimchanghyun: 105, kimdaehee: 97, jangikjun: 91,
}

/** Sky + grass hill with all 8 figures standing on it. */
export function Hero({ height = 280, children }: { height?: number; children?: ReactNode }) {
  const center = LINEUP.indexOf('kimdonguk')
  const scale = Math.min((height - 120) / 120, 1.45) // keep all 8 inside the phone width
  return (
    <div className="hero" style={{ height }}>
      <Clouds />
      <div className="hill" />
      <div className="hero-lineup">
        {LINEUP.map((s, i) => (
          <img
            key={s}
            src={img.full(s)}
            alt=""
            style={{
              height: HEIGHT[s] * scale,
              margin: `0 ${-7 * scale}px`,
              zIndex: i === center ? 10 : 9 - Math.abs(i - center),
            }}
          />
        ))}
      </div>
      {children}
    </div>
  )
}

/** Page header: emoji tile + title + optional right slot. */
export function PageHead({ icon, title, right }: { icon: string; title: string; right?: ReactNode }) {
  return (
    <div className="page-head">
      <span className="page-head-icon">{icon}</span>
      <span className="page-head-title">{title}</span>
      <span style={{ marginLeft: 'auto' }}>{right}</span>
    </div>
  )
}

export function SectionTitle({ icon, children, right }: { icon: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="section-h">
      <span>
        <span style={{ marginRight: 6 }}>{icon}</span>
        {children}
      </span>
      {right}
    </div>
  )
}

/** Two-row group photo: 5 in the back, 3 in front with 김동욱 in the middle. */
export function GroupShot({ back = 1.75, front = 2.05 }: { back?: number; front?: number }) {
  const backRow = ['kimdaehee', 'kimchanghyun', 'parkminhoon', 'leejaeho', 'jangikjun']
  const frontRow = ['chohyunjun', 'kimdonguk', 'choiseungbin']
  return (
    <div className="group-shot">
      <div className="group-row" style={{ marginBottom: -HEIGHT.kimdonguk * front * 0.62 }}>
        {backRow.map((s) => (
          <img key={s} src={img.full(s)} alt="" style={{ height: HEIGHT[s] * back, margin: `0 ${-8 * back}px` }} />
        ))}
      </div>
      <div className="group-row front">
        {frontRow.map((s, i) => (
          <img key={s} src={img.full(s)} alt="" style={{ height: HEIGHT[s] * front, margin: `0 ${-4 * front}px`, zIndex: i === 1 ? 3 : 2 }} />
        ))}
      </div>
    </div>
  )
}
