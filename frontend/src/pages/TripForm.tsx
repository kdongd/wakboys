import { useState } from 'react'
import { Sheet } from '../components/ui'
import type { Trip } from '../types'

export type TripInput = {
  year: number
  season: 'SUMMER' | 'WINTER'
  title: string
  destination?: string
  startDate?: string
  endDate?: string
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
          })
        }
      >
        {initial ? '저장' : '만들기'}
      </button>
    </Sheet>
  )
}
