import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { MiniBox } from '../components/Edition'
import { useErrorToast } from '../components/Toast'
import { Clouds, PageHead } from '../components/World'
import TripMap from '../components/TripMap'
import { Avatar, Empty, Spinner } from '../components/ui'
import type { Trip } from '../types'
import { useMembers } from '../useMembers'
import { ddayLabel, range, seasonKo } from '../util'
import { TripForm, type TripInput } from './TripForm'

export default function Trips() {
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const err = useErrorToast()
  const { cards } = useMembers()
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

  const linked = cards.filter((c) => c.linked).map((c) => c.member)
  const upcoming = (q.data ?? []).find((t) => t.status === 'UPCOMING' || t.status === 'ONGOING' || t.status === 'TBD')

  return (
    <div className="page">
      <PageHead
        icon="🧳"
        title="모임 & 여행"
        right={<button className="btn sm" onClick={() => setParams({ new: '1' })}>+ 새 여행</button>}
      />

      <Link to={upcoming ? `/trips/${upcoming.id}?tab=vote` : '/trips?new=1'} className="sky-banner">
        <Clouds />
        <div className="bubble">
          {upcoming ? '다음 여행지를\n함께 정해요! ✈️' : '첫 여행을\n만들어볼까요? ✈️'}
        </div>
        <span className="sky-banner-emoji">🏝️</span>
      </Link>

      {q.data && q.data.length > 0 && (
        <div className="mt16">
          <TripMap trips={q.data} />
        </div>
      )}

      {!q.data ? (
        <Spinner />
      ) : q.data.length === 0 ? (
        <Empty>아직 여행이 없어요</Empty>
      ) : (
        <div className="stack mt16">
          {q.data.map((t) => {
            const active = t.status === 'UPCOMING' || t.status === 'ONGOING'
            return (
              <div key={t.id} className="card trip-card">
                <Link to={`/trips/${t.id}`} className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                  <MiniBox trip={t} link={false} />
                  <div className="grow">
                    <div className="between">
                      <span className="small bold" style={{ color: 'var(--purple)' }}>
                        {t.year} {seasonKo(t.season)} · SERIES {String(t.edition).padStart(2, '0')}
                      </span>
                      {active ? (
                        <span className="chip crown">👑 {ddayLabel(t.dday, t.status)}</span>
                      ) : (
                        <span className="chip">{ddayLabel(t.dday, t.status)}</span>
                      )}
                    </div>
                    <div className="bold ellipsis" style={{ fontSize: 18, marginTop: 4 }}>
                      {t.title} {t.season === 'SUMMER' ? '🏖️' : '⛄'}
                    </div>
                    <div className="small muted bold" style={{ marginTop: 3 }}>
                      {t.destination ?? '여행지 미정'} · {range(t.startDate, t.endDate)}
                    </div>
                    {t.mediaCount > 0 && <div className="small bold mt8" style={{ color: 'var(--sub)' }}>📸 사진·영상 {t.mediaCount}</div>}
                  </div>
                </Link>
                {active && (
                  <>
                    <div className="join-row mt12">
                      <span className="small bold">참여 {linked.length} / 8</span>
                      <span className="rx-stack" style={{ marginLeft: 'auto' }}>
                        {linked.slice(0, 6).map((m) => (
                          <Avatar key={m.id} m={m} size={28} ring={false} />
                        ))}
                      </span>
                      {linked.length > 6 && <span className="small bold muted">+{linked.length - 6}</span>}
                    </div>
                    <Link to={`/trips/${t.id}?tab=vote`} className="btn yellow mt12">☑️ 여행 투표하기</Link>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {open && (
        <TripForm open onClose={() => setParams({})} busy={create.isPending} onSubmit={(v) => create.mutate(v)} />
      )}
    </div>
  )
}
