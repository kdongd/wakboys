import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api'
import { useErrorToast } from '../../components/Toast'
import { confirmAsk, Empty, Sheet, Spinner } from '../../components/ui'
import { categoryOf, loadKakaoMaps, searchPlaces, type PlaceHit } from '../../kakaoMap'
import type { Place } from '../../types'

const CATS: Record<string, string> = { FOOD: '🍖 맛집', CAFE: '☕ 카페', BAR: '🍺 술집', SIGHT: '📸 구경', STAY: '🏠 숙소', ETC: '📍 기타' }

export default function Places({ tripId }: { tripId: number }) {
  const qc = useQueryClient()
  const err = useErrorToast()
  const key = ['places', tripId]
  const q = useQuery({ queryKey: key, queryFn: () => api.get<Place[]>(`/api/trips/${tripId}/places`) })
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<string | null>(null)
  const [kakao, setKakao] = useState<unknown>(undefined)
  const mapEl = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadKakaoMaps().then(setKakao)
  }, [])

  const items = (q.data ?? []).filter((p) => !filter || p.category === filter)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const k = kakao as any
    if (!k || !mapEl.current) return
    const pts = items.filter((p) => p.lat != null && p.lng != null)
    const center = pts.length ? new k.maps.LatLng(pts[0].lat, pts[0].lng) : new k.maps.LatLng(37.5665, 126.978)
    const map = new k.maps.Map(mapEl.current, { center, level: 6 })
    if (pts.length) {
      const bounds = new k.maps.LatLngBounds()
      pts.forEach((p) => {
        const pos = new k.maps.LatLng(p.lat, p.lng)
        bounds.extend(pos)
        const marker = new k.maps.Marker({ map, position: pos, title: p.name })
        const info = new k.maps.InfoWindow({ content: `<div style="padding:6px 10px;font-size:12px;font-weight:700;white-space:nowrap">${p.name.replace(/</g, '&lt;')}</div>` })
        k.maps.event.addListener(marker, 'click', () => info.open(map, marker))
      })
      if (pts.length > 1) map.setBounds(bounds)
    }
  }, [kakao, items])

  const toggle = useMutation({
    mutationFn: (p: Place) => api.patch<Place>(`/api/places/${p.id}`, { visited: !p.visited }),
    onSuccess: (p) => qc.setQueryData<Place[]>(key, (l) => l?.map((x) => (x.id === p.id ? p : x))),
    onError: err,
  })
  const del = useMutation({
    mutationFn: (id: number) => api.del(`/api/places/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: err,
  })

  const used = new Set((q.data ?? []).map((p) => p.category))

  return (
    <div>
      {kakao ? <div ref={mapEl} className="map-box" /> : null}
      <div className="seg mt12" style={{ marginTop: kakao ? 12 : 0 }}>
        <button className={!filter ? 'on' : ''} onClick={() => setFilter(null)}>전체 {(q.data ?? []).length}</button>
        {Object.entries(CATS).filter(([k]) => used.has(k)).map(([k, v]) => (
          <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{v}</button>
        ))}
      </div>
      <button className="btn outline" onClick={() => setAdding(true)}>+ 가고 싶은 곳</button>
      <div className="mt12">
        {!q.data ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty>가고 싶은 장소를 모아보세요</Empty>
        ) : (
          <div className="card" style={{ padding: '4px 16px' }}>
            {items.map((p) => (
              <div key={p.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                <button className={'check' + (p.visited ? '' : ' off')} style={{ background: p.visited ? 'var(--ink)' : undefined, marginTop: 2 }} onClick={() => toggle.mutate(p)}>✓</button>
                <div className="grow">
                  <div className="row" style={{ gap: 6 }}>
                    <span className="bold" style={{ fontSize: 15, textDecoration: p.visited ? 'line-through' : undefined, opacity: p.visited ? 0.5 : 1 }}>{p.name}</span>
                    <span className="small muted">{CATS[p.category]?.split(' ')[0]}</span>
                  </div>
                  {p.address && <div className="small muted mt8" style={{ marginTop: 2 }}>{p.address}</div>}
                  {p.memo && <div className="small mt8" style={{ marginTop: 4 }}>{p.memo}</div>}
                  <div className="row mt8" style={{ gap: 6 }}>
                    <a className="chip" target="_blank" rel="noreferrer"
                       href={p.url || (p.lat != null ? `https://map.kakao.com/link/map/${encodeURIComponent(p.name)},${p.lat},${p.lng}` : `https://map.kakao.com/link/search/${encodeURIComponent(p.address || p.name)}`)}>
                      지도
                    </a>
                    {p.createdBy && <span className="small muted bold">{p.createdBy.name} 추천</span>}
                    <button className="small muted" style={{ marginLeft: 'auto' }} onClick={() => confirmAsk(`${p.name}을(를) 지울까요?`) && del.mutate(p.id)}>삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {adding && (
        <AddPlace
          tripId={tripId}
          kakao={kakao}
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false)
            qc.invalidateQueries({ queryKey: key })
          }}
        />
      )}
    </div>
  )
}

function AddPlace({ tripId, kakao, onClose, onDone }: { tripId: number; kakao: unknown; onClose: () => void; onDone: () => void }) {
  const err = useErrorToast()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<PlaceHit[]>([])
  const [form, setForm] = useState({ name: '', category: 'FOOD', address: '', url: '', memo: '', lat: undefined as number | undefined, lng: undefined as number | undefined })
  const save = useMutation({ mutationFn: () => api.post(`/api/trips/${tripId}/places`, form), onSuccess: onDone, onError: err })

  const search = async () => {
    if (!kakao || !query.trim()) return
    setHits(await searchPlaces(kakao, query.trim()))
  }

  return (
    <Sheet open onClose={onClose} title="장소 추가">
      {kakao ? (
        <>
          <form className="row mt12" onSubmit={(e) => { e.preventDefault(); search() }}>
            <input className="input" placeholder="카카오맵에서 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="btn sm">검색</button>
          </form>
          {hits.length > 0 && (
            <div className="mt8" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {hits.map((h, i) => (
                <button key={i} className="list-row" style={{ width: '100%', textAlign: 'left' }}
                        onClick={() => { setForm({ ...form, name: h.name, address: h.address, url: h.url, lat: h.lat, lng: h.lng, category: categoryOf(h.category) }); setHits([]) }}>
                  <span className="grow">
                    <span className="bold" style={{ fontSize: 14, display: 'block' }}>{h.name}</span>
                    <span className="small muted">{h.address}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : null}
      <label className="label">이름</label>
      <input className="input" value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <label className="label">종류</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }} className="toggle-row">
        {Object.entries(CATS).map(([k, v]) => (
          <button key={k} className={form.category === k ? 'on' : ''} onClick={() => setForm({ ...form, category: k })}>{v}</button>
        ))}
      </div>
      <label className="label">주소</label>
      <input className="input" value={form.address} maxLength={200} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      <label className="label">메모</label>
      <input className="input" placeholder="예: 웨이팅 김, 고기 맛집" value={form.memo} maxLength={500} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
      <button className="btn mt16" disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>추가</button>
    </Sheet>
  )
}
