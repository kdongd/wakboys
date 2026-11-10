import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../auth'
import { EditionBox } from '../../components/Edition'
import { useErrorToast, useToast } from '../../components/Toast'
import { Back, confirmAsk, Spinner } from '../../components/ui'
import type { Trip, TripDetail as Detail } from '../../types'
import { nights } from '../../util'
import { TripForm, type TripInput } from '../TripForm'
import Votes from './Votes'
import Itinerary from './Itinerary'
import Places from './Places'
import Checklist from './Checklist'
import Settle from './Settle'
import Archive from './Archive'

const TABS = [
  { key: 'vote', label: '투표' },
  { key: 'plan', label: '일정' },
  { key: 'place', label: '장소' },
  { key: 'pack', label: '준비물' },
  { key: 'settle', label: '정산' },
  { key: 'archive', label: '아카이브' },
] as const

export default function TripDetail() {
  const id = Number(useParams().id)
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const err = useErrorToast()
  const { me } = useAuth()
  const [editing, setEditing] = useState(false)
  const q = useQuery({ queryKey: ['trip', id], queryFn: () => api.get<Detail>(`/api/trips/${id}`) })

  const update = useMutation({
    mutationFn: (v: TripInput) => api.patch<Trip>(`/api/trips/${id}`, v),
    onSuccess: () => {
      setEditing(false)
      qc.invalidateQueries({ queryKey: ['trip', id] })
      qc.invalidateQueries({ queryKey: ['trips'] })
      qc.invalidateQueries({ queryKey: ['home'] })
      toast('저장했어요')
    },
    onError: err,
  })
  const remove = useMutation({
    mutationFn: () => api.del(`/api/trips/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      qc.invalidateQueries({ queryKey: ['home'] })
      nav('/trips', { replace: true })
    },
    onError: err,
  })

  if (!q.data) return <div className="page no-tab"><Back label="에디션" /><Spinner /></div>
  const d = q.data
  const t = d.trip
  const tab = params.get('tab') ?? (t.status === 'DONE' ? 'archive' : 'vote')
  const setTab = (k: string) => setParams({ tab: k }, { replace: true })

  return (
    <div className="page no-tab">
      <div className="between">
        <Back to="/trips" label="에디션" />
        <div className="row" style={{ gap: 6 }}>
          <button className="chip" style={{ background: '#fff' }} onClick={() => setEditing(true)}>편집</button>
          {me?.member.admin && (
            <button className="chip red" onClick={() => confirmAsk(`「${t.title}」을 삭제할까요? 사진·영상·정산 기록까지 모두 지워져요.`) && remove.mutate()}>
              삭제
            </button>
          )}
        </div>
      </div>

      <div className="mt8">
        <EditionBox trip={t} height={220} />
      </div>
      <div className="mt12" style={{ padding: '0 2px' }}>
        <div className="title" style={{ fontSize: 22 }}>{t.title}</div>
        <div className="small bold muted mt8">
          {t.destination ?? '여행지 미정'}
          {nights(t.startDate, t.endDate) && ` · ${nights(t.startDate, t.endDate)}`}
        </div>
      </div>

      <div className="seg mt16">
        {TABS.map((x) => (
          <button key={x.key} className={tab === x.key ? 'on' : ''} onClick={() => setTab(x.key)}>
            {x.label}
            {x.key === 'vote' && d.openPolls > 0 && ` ${d.openPolls}`}
            {x.key === 'pack' && d.checklist.total > 0 && ` ${d.checklist.done}/${d.checklist.total}`}
          </button>
        ))}
      </div>

      {tab === 'vote' && <Votes tripId={id} />}
      {tab === 'plan' && <Itinerary trip={t} />}
      {tab === 'place' && <Places tripId={id} />}
      {tab === 'pack' && <Checklist tripId={id} />}
      {tab === 'settle' && <Settle tripId={id} />}
      {tab === 'archive' && <Archive tripId={id} />}

      {editing && (
        <TripForm open initial={t} busy={update.isPending} onClose={() => setEditing(false)} onSubmit={(v) => update.mutate(v)} />
      )}
    </div>
  )
}
