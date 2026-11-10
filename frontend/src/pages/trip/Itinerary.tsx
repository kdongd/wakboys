import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api'
import { useErrorToast } from '../../components/Toast'
import { confirmAsk, Empty, Sheet, Spinner } from '../../components/ui'
import type { ItineraryItem, Trip } from '../../types'
import { md } from '../../util'

function dayDate(trip: Trip, day: number) {
  if (!trip.startDate) return null
  const d = new Date(trip.startDate + 'T00:00:00')
  d.setDate(d.getDate() + day - 1)
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${md(iso)} (${'일월화수목금토'[d.getDay()]})`
}

export default function Itinerary({ trip }: { trip: Trip }) {
  const qc = useQueryClient()
  const key = ['itinerary', trip.id]
  const q = useQuery({ queryKey: key, queryFn: () => api.get<ItineraryItem[]>(`/api/trips/${trip.id}/itinerary`) })
  const [edit, setEdit] = useState<ItineraryItem | { dayNo: number } | null>(null)

  const tripDays = trip.startDate && trip.endDate
    ? Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000) + 1
    : 0
  const maxDay = Math.max(tripDays, ...(q.data ?? []).map((i) => i.dayNo), 1)
  const days = Array.from({ length: maxDay }, (_, i) => i + 1)

  return (
    <div>
      {!q.data ? (
        <Spinner />
      ) : (
        <>
          {q.data.length === 0 && <Empty>일차별로 일정을 채워보세요</Empty>}
          {days.map((day) => {
            const items = q.data!.filter((i) => i.dayNo === day)
            return (
              <div key={day}>
                <div className="day-h">
                  <span>{day}일차</span>
                  <span style={{ background: 'transparent', color: 'var(--brown)', padding: 0 }}>{dayDate(trip, day)}</span>
                  <button className="small bold brown" style={{ marginLeft: 'auto' }} onClick={() => setEdit({ dayNo: day })}>+ 추가</button>
                </div>
                {items.length > 0 && (
                  <div className="card timeline" style={{ padding: '4px 16px 4px 30px' }}>
                    {items.map((i) => (
                      <button key={i.id} className="list-row" style={{ width: '100%', textAlign: 'left', position: 'relative' }} onClick={() => setEdit(i)}>
                        <span className="dot" />
                        <span className="small bold brown" style={{ width: 42, flex: 'none' }}>{i.startTime ?? '—'}</span>
                        <span className="grow">
                          <span className="bold" style={{ fontSize: 14 }}>{i.title}</span>
                          {i.memo && <span className="small muted" style={{ display: 'block', marginTop: 2, whiteSpace: 'pre-wrap' }}>{i.memo}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          <button className="btn light mt16" onClick={() => setEdit({ dayNo: maxDay + 1 })}>+ {maxDay + 1}일차 추가</button>
        </>
      )}
      {edit && (
        <ItemSheet
          tripId={trip.id}
          item={edit}
          maxDay={maxDay + 1}
          onClose={() => setEdit(null)}
          onDone={() => {
            setEdit(null)
            qc.invalidateQueries({ queryKey: key })
          }}
        />
      )}
    </div>
  )
}

function ItemSheet({ tripId, item, maxDay, onClose, onDone }: {
  tripId: number
  item: ItineraryItem | { dayNo: number }
  maxDay: number
  onClose: () => void
  onDone: () => void
}) {
  const err = useErrorToast()
  const existing = 'id' in item ? item : null
  const [dayNo, setDay] = useState(item.dayNo)
  const [startTime, setTime] = useState(existing?.startTime ?? '')
  const [title, setTitle] = useState(existing?.title ?? '')
  const [memo, setMemo] = useState(existing?.memo ?? '')
  const save = useMutation({
    mutationFn: () => {
      const body = { dayNo, startTime, title, memo }
      return existing ? api.patch(`/api/itinerary/${existing.id}`, body) : api.post(`/api/trips/${tripId}/itinerary`, body)
    },
    onSuccess: onDone,
    onError: err,
  })
  const del = useMutation({ mutationFn: () => api.del(`/api/itinerary/${existing!.id}`), onSuccess: onDone, onError: err })

  return (
    <Sheet open onClose={onClose} title={existing ? '일정 수정' : '일정 추가'}>
      <label className="label">일차 · 시간</label>
      <div className="row">
        <select className="select" value={dayNo} onChange={(e) => setDay(Number(e.target.value))} style={{ width: 110 }}>
          {Array.from({ length: Math.max(maxDay, dayNo) }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d}일차</option>
          ))}
        </select>
        <input className="input" type="time" value={startTime} onChange={(e) => setTime(e.target.value)} />
      </div>
      <label className="label">내용</label>
      <input className="input" placeholder="예: 숙소 체크인" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
      <label className="label">메모</label>
      <textarea className="textarea" placeholder="주소, 예약 번호 등" value={memo} maxLength={500} onChange={(e) => setMemo(e.target.value)} />
      <button className="btn mt16" disabled={!title.trim() || save.isPending} onClick={() => save.mutate()}>저장</button>
      {existing && (
        <button className="btn danger mt8" onClick={() => confirmAsk('이 일정을 지울까요?') && del.mutate()}>삭제</button>
      )}
    </Sheet>
  )
}
