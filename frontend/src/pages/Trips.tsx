import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { MiniBox } from '../components/Edition'
import { useErrorToast } from '../components/Toast'
import { Empty, Spinner } from '../components/ui'
import type { Trip } from '../types'
import { ddayLabel, range, seasonKo } from '../util'
import { TripForm, type TripInput } from './TripForm'

export default function Trips() {
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const err = useErrorToast()
  const q = useQuery({ queryKey: ['trips'], queryFn: () => api.get<Trip[]>('/api/trips') })
  const open = params.get('new') === '1'

  const create = useMutation({
    mutationFn: (v: TripInput) => api.post<Trip>('/api/trips', v),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      qc.invalidateQueries({ queryKey: ['home'] })
      nav(`/trips/${t.id}`)
    },
    onError: err,
  })

  const byYear = new Map<number, Trip[]>()
  ;(q.data ?? []).forEach((t) => byYear.set(t.year, [...(byYear.get(t.year) ?? []), t]))

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <div className="eyebrow">EDITIONS</div>
          <div className="title">에디션</div>
        </div>
        <button className="btn sm" onClick={() => setParams({ new: '1' })}>+ 새 에디션</button>
      </div>

      {!q.data ? (
        <Spinner />
      ) : q.data.length === 0 ? (
        <Empty>첫 에디션을 만들어보세요</Empty>
      ) : (
        [...byYear.entries()].map(([year, trips]) => (
          <div key={year}>
            <div className="section-h"><span>{year}</span><small>{trips.length}개 에디션</small></div>
            <div className="stack">
              {trips.map((t) => (
                <Link key={t.id} to={`/trips/${t.id}`} className="card row" style={{ padding: 12, gap: 14 }}>
                  <MiniBox trip={t} link={false} />
                  <div className="grow">
                    <div className="small bold brown">SERIES {String(t.edition).padStart(2, '0')} · {seasonKo(t.season)}</div>
                    <div className="bold ellipsis" style={{ fontSize: 17, marginTop: 2 }}>{t.title}</div>
                    <div className="small muted bold mt8">{t.destination ?? '여행지 미정'} · {range(t.startDate, t.endDate)}</div>
                    <div className="row mt8" style={{ gap: 6 }}>
                      <span className={'chip' + (t.status === 'UPCOMING' || t.status === 'ONGOING' ? ' on' : '')}>{ddayLabel(t.dday, t.status)}</span>
                      {t.mediaCount > 0 && <span className="chip">📸 {t.mediaCount}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}

      {open && (
        <TripForm open onClose={() => setParams({})} busy={create.isPending} onSubmit={(v) => create.mutate(v)} />
      )}
    </div>
  )
}
