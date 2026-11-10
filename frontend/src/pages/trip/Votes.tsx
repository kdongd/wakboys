import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api'
import { useAuth } from '../../auth'
import { useErrorToast } from '../../components/Toast'
import { Avatar, confirmAsk, Empty, Sheet, Spinner } from '../../components/ui'
import type { Poll } from '../../types'
import { useMembers } from '../../useMembers'

const CATS = [
  { key: 'DESTINATION', label: '여행지', q: '어디로 갈까?' },
  { key: 'DATE', label: '날짜', q: '언제 갈까?' },
  { key: 'STAY', label: '숙소', q: '숙소 어디로 할까?' },
  { key: 'ETC', label: '기타', q: '' },
] as const

export default function Votes({ tripId }: { tripId: number }) {
  const qc = useQueryClient()
  const key = ['polls', tripId]
  const q = useQuery({ queryKey: key, queryFn: () => api.get<Poll[]>(`/api/trips/${tripId}/polls`) })
  const [creating, setCreating] = useState(false)

  const replace = (p: Poll) => {
    qc.setQueryData<Poll[]>(key, (list) => list?.map((x) => (x.id === p.id ? p : x)))
    qc.invalidateQueries({ queryKey: ['trip', tripId] })
  }

  return (
    <div>
      <button className="btn outline" onClick={() => setCreating(true)}>+ 새 투표</button>
      <div className="mt12">
        {!q.data ? <Spinner /> : q.data.length === 0 ? <Empty>아직 투표가 없어요</Empty> : q.data.map((p) => <PollCard key={p.id} poll={p} onChange={replace} />)}
      </div>
      {creating && (
        <NewPoll
          tripId={tripId}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            qc.invalidateQueries({ queryKey: key })
            qc.invalidateQueries({ queryKey: ['trip', tripId] })
          }}
        />
      )}
    </div>
  )
}

function PollCard({ poll, onChange }: { poll: Poll; onChange: (p: Poll) => void }) {
  const { me } = useAuth()
  const { byId } = useMembers()
  const qc = useQueryClient()
  const err = useErrorToast()
  const [adding, setAdding] = useState('')
  const vote = useMutation({ mutationFn: (ids: number[]) => api.post<Poll>(`/api/polls/${poll.id}/vote`, { optionIds: ids }), onSuccess: onChange, onError: err })
  const addOpt = useMutation({
    mutationFn: () => api.post<Poll>(`/api/polls/${poll.id}/options`, { label: adding }),
    onSuccess: (p) => { setAdding(''); onChange(p) },
    onError: err,
  })
  const close = useMutation({ mutationFn: () => api.post<Poll>(`/api/polls/${poll.id}/close`), onSuccess: onChange, onError: err })
  const del = useMutation({
    mutationFn: () => api.del(`/api/polls/${poll.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['polls', poll.tripId] }),
    onError: err,
  })
  const max = Math.max(1, ...poll.options.map((o) => o.voterIds.length))
  const canManage = me && (poll.createdBy?.id === me.member.id || me.member.admin)
  const cat = CATS.find((c) => c.key === poll.category)

  const toggle = (optionId: number) => {
    if (!poll.open) return
    const mine = poll.myOptionIds
    const next = poll.multiple
      ? mine.includes(optionId) ? mine.filter((x) => x !== optionId) : [...mine, optionId]
      : mine.includes(optionId) ? [] : [optionId]
    vote.mutate(next)
  }

  return (
    <div className="card">
      <div className="between">
        <div className="row" style={{ gap: 6 }}>
          <span className="chip">{cat?.label}</span>
          {poll.open ? <span className="chip green">진행 중</span> : <span className="chip">마감</span>}
          {poll.multiple && <span className="chip">복수 선택</span>}
        </div>
        <span className="small bold muted">{poll.voterCount}/8명 참여</span>
      </div>
      <div className="bold mt12" style={{ fontSize: 17 }}>{poll.question}</div>
      {poll.closesAt && poll.open && <div className="small muted bold mt8">{new Date(poll.closesAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })} 마감</div>}
      <div className="stack mt12" style={{ gap: 6 }}>
        {poll.options.map((o) => {
          const mine = poll.myOptionIds.includes(o.id)
          const lead = !poll.open && poll.leadingOptionIds.includes(o.id)
          return (
            <button key={o.id} className={'poll-opt' + (mine ? ' mine' : '')} onClick={() => toggle(o.id)} disabled={vote.isPending}>
              <div className="fill" style={{ width: `${(o.voterIds.length / max) * 100}%`, background: lead ? '#ffe9a6' : undefined }} />
              <span className={'radio' + (poll.multiple ? ' sq' : '') + (mine ? ' on' : '')} />
              <span className="grow bold" style={{ fontSize: 14 }}>{lead && '🏆 '}{o.label}</span>
              <span className="rx-stack">
                {o.voterIds.slice(0, 4).map((v) => {
                  const m = byId.get(v)
                  return m ? <img key={v} src={`/characters/${m.slug}/profile.webp`} alt={m.name} style={{ width: 22, height: 22 }} /> : null
                })}
              </span>
              <span className="small bold" style={{ width: 18, textAlign: 'right' }}>{o.voterIds.length}</span>
            </button>
          )
        })}
      </div>
      {poll.open && (
        <form className="row mt8" onSubmit={(e) => { e.preventDefault(); if (adding.trim()) addOpt.mutate() }}>
          <input className="input" placeholder="선택지 추가" value={adding} maxLength={100} onChange={(e) => setAdding(e.target.value)} />
          <button className="btn sm light" disabled={!adding.trim()}>추가</button>
        </form>
      )}
      <div className="between mt12">
        <div className="row small muted bold" style={{ gap: 6 }}>
          {poll.createdBy && <Avatar m={poll.createdBy} size={20} ring={false} />}
          {poll.createdBy?.name}
        </div>
        {canManage && (
          <div className="row" style={{ gap: 6 }}>
            {poll.open && <button className="chip" onClick={() => confirmAsk('투표를 마감할까요?') && close.mutate()}>마감</button>}
            <button className="chip red" onClick={() => confirmAsk('투표를 삭제할까요?') && del.mutate()}>삭제</button>
          </div>
        )}
      </div>
    </div>
  )
}

function NewPoll({ tripId, onClose, onCreated }: { tripId: number; onClose: () => void; onCreated: () => void }) {
  const err = useErrorToast()
  const [category, setCategory] = useState<(typeof CATS)[number]['key']>('DESTINATION')
  const [question, setQuestion] = useState<string>(CATS[0].q)
  const [options, setOptions] = useState(['', ''])
  const [multiple, setMultiple] = useState(false)
  const [closesAt, setClosesAt] = useState('')
  const create = useMutation({
    mutationFn: () =>
      api.post(`/api/trips/${tripId}/polls`, {
        category,
        question,
        multiple,
        options,
        closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
      }),
    onSuccess: onCreated,
    onError: err,
  })
  const filled = options.filter((o) => o.trim()).length

  return (
    <Sheet open onClose={onClose} title="새 투표">
      <label className="label">무엇을 정할까요</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }} className="toggle-row">
        {CATS.map((c) => (
          <button key={c.key} className={category === c.key ? 'on' : ''} onClick={() => { setCategory(c.key); if (c.q) setQuestion(c.q) }}>
            {c.label}
          </button>
        ))}
      </div>
      <label className="label">질문</label>
      <input className="input" value={question} maxLength={100} onChange={(e) => setQuestion(e.target.value)} />
      <label className="label">선택지</label>
      <div className="stack" style={{ gap: 6 }}>
        {options.map((o, i) => (
          <input
            key={i}
            className="input"
            placeholder={category === 'DATE' ? '예: 1/23 ~ 1/25' : `선택지 ${i + 1}`}
            value={o}
            maxLength={100}
            onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
          />
        ))}
        <button className="btn light sm" style={{ alignSelf: 'flex-start' }} onClick={() => setOptions([...options, ''])}>+ 선택지</button>
      </div>
      <label className="label">옵션</label>
      <div className="toggle-row">
        <button className={!multiple ? 'on' : ''} onClick={() => setMultiple(false)}>하나만</button>
        <button className={multiple ? 'on' : ''} onClick={() => setMultiple(true)}>여러 개</button>
      </div>
      <label className="label">마감 (선택)</label>
      <input className="input" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
      <button className="btn mt24" disabled={!question.trim() || filled < 2 || create.isPending} onClick={() => create.mutate()}>
        투표 올리기
      </button>
    </Sheet>
  )
}
