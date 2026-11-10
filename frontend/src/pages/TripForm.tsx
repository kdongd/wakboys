import { useEffect, useState } from 'react'
import { loadKakaoMaps, searchPlaces, type PlaceHit } from '../kakaoMap'
import { guessPlace, KNOWN_PLACES } from '../places'
import { Sheet } from '../components/ui'
import type { Trip } from '../types'

export type TripInput = {
  year: number
  season: 'SUMMER' | 'WINTER'
  title: string
  destination?: string
  startDate?: string
  endDate?: string
  lat?: number
  lng?: number
}

export function TripForm({ open, onClose, initial, onSubmit, busy }: {
  open: boolean
  onClose: () => void
  initial?: Trip
  onSubmit: (v: TripInput) => void
  busy?: boolean
}) {
  const now = new Date()
  const defSeason = now.getMonth() >= 2 && now.getMonth() <= 7 ? 'SUMMER' : 'WINTER'
  const [year, setYear] = useState(initial?.year ?? (defSeason === 'WINTER' && now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear()))
  const [season, setSeason] = useState<'SUMMER' | 'WINTER'>(initial?.season ?? defSeason)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [destination, setDestination] = useState(initial?.destination ?? '')
  const [startDate, setStart] = useState(initial?.startDate ?? '')
  const [endDate, setEnd] = useState(initial?.endDate ?? '')
  const [loc, setLoc] = useState<{ lat: number; lng: number; label: string } | null>(
    initial?.lat != null && initial?.lng != null ? { lat: initial.lat, lng: initial.lng, label: initial.destination ?? '저장된 위치' } : null,
  )
  const [manual, setManual] = useState(initial?.lat != null)
  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<PlaceHit[]>([])
  const [kakao, setKakao] = useState<unknown>(null)

  useEffect(() => {
    loadKakaoMaps().then(setKakao)
  }, [])

  // until someone picks a spot by hand, follow whatever the 여행지 text says
  useEffect(() => {
    if (manual) return
    const p = guessPlace(destination, title)
    setLoc(p ? { lat: p.lat, lng: p.lng, label: p.name } : null)
  }, [destination, title, manual])

  const search = async () => {
    if (!query.trim()) return
    if (kakao) setHits(await searchPlaces(kakao, query.trim()))
  }
  const quick = KNOWN_PLACES.filter((p) => !query.trim() || p.name.includes(query.trim())).slice(0, 18)

  return (
    <Sheet open={open} onClose={onClose} title={initial ? '에디션 편집' : '새 에디션'}>
      <label className="label">연도 · 시즌</label>
      <div className="row">
        <input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 110 }} />
        <div className="toggle-row grow">
          <button className={season === 'SUMMER' ? 'on' : ''} onClick={() => setSeason('SUMMER')}>☀️ 여름</button>
          <button className={season === 'WINTER' ? 'on' : ''} onClick={() => setSeason('WINTER')}>❄️ 겨울</button>
        </div>
      </div>
      <label className="label">제목</label>
      <input className="input" placeholder="예: 평창 스키 여행" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
      <label className="label">여행지 (정해지면)</label>
      <input className="input" placeholder="예: 강원 평창" value={destination} maxLength={60} onChange={(e) => setDestination(e.target.value)} />
      <label className="label">지도 위치</label>
      <div className="row">
        <div className="input grow" style={{ display: 'flex', alignItems: 'center', gap: 6, color: loc ? 'var(--ink)' : 'var(--sub)' }}>
          📍 {loc ? loc.label : '여행지를 입력하면 자동으로 찾아요'}
        </div>
        <button className="btn sm light" onClick={() => setPicking(!picking)}>{picking ? '닫기' : '직접 고르기'}</button>
      </div>
      {picking && (
        <div className="card" style={{ marginTop: 8, padding: 12 }}>
          <form className="row" onSubmit={(e) => { e.preventDefault(); search() }}>
            <input className="input" placeholder={kakao ? '장소 검색 (예: 휘닉스 평창)' : '지역 이름'} value={query} onChange={(e) => setQuery(e.target.value)} />
            {!!kakao && <button className="btn sm">검색</button>}
          </form>
          {hits.length > 0 ? (
            <div className="mt8" style={{ maxHeight: 200, overflowY: 'auto' }}>
              {hits.map((h, i) => (
                <button key={i} className="list-row" style={{ width: '100%', textAlign: 'left' }}
                        onClick={() => { setLoc({ lat: h.lat, lng: h.lng, label: h.name }); setManual(true); setPicking(false); setHits([]) }}>
                  <span className="grow">
                    <span className="bold" style={{ fontSize: 14, display: 'block' }}>{h.name}</span>
                    <span className="small muted">{h.address}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt8" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {quick.map((p) => (
                <button key={p.name} className="chip" onClick={() => { setLoc({ lat: p.lat, lng: p.lng, label: p.name }); setManual(true); setPicking(false) }}>
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <label className="label">날짜 (정해지면)</label>
      <div className="row">
        <input className="input" type="date" value={startDate} onChange={(e) => setStart(e.target.value)} />
        <span className="muted">~</span>
        <input className="input" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <button
        className="btn mt24"
        disabled={busy || !title.trim()}
        onClick={() =>
          onSubmit({
            year,
            season,
            title: title.trim(),
            destination: destination.trim(),
            startDate: startDate || undefined,
            endDate: endDate || startDate || undefined,
            lat: loc?.lat,
            lng: loc?.lng,
          })
        }
      >
        {initial ? '저장' : '만들기'}
      </button>
    </Sheet>
  )
}
