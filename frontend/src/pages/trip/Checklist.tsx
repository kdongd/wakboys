import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api'
import { useAuth } from '../../auth'
import { useErrorToast } from '../../components/Toast'
import { Avatar, Bar, confirmAsk, Empty, Spinner } from '../../components/ui'
import type { ChecklistItem } from '../../types'
import { useMembers } from '../../useMembers'

export default function Checklist({ tripId }: { tripId: number }) {
  const { me } = useAuth()
  const { members } = useMembers()
  const qc = useQueryClient()
  const err = useErrorToast()
  const key = ['checklist', tripId]
  const q = useQuery({ queryKey: key, queryFn: () => api.get<ChecklistItem[]>(`/api/trips/${tripId}/checklist`) })
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<'SHARED' | 'EACH'>('SHARED')

  const refresh = () => {
    qc.invalidateQueries({ queryKey: key })
    qc.invalidateQueries({ queryKey: ['trip', tripId] })
  }
  const replace = (i: ChecklistItem) => {
    qc.setQueryData<ChecklistItem[]>(key, (l) => l?.map((x) => (x.id === i.id ? i : x)))
    qc.invalidateQueries({ queryKey: ['trip', tripId] })
  }
  const add = useMutation({
    mutationFn: () => api.post(`/api/trips/${tripId}/checklist`, { title, kind }),
    onSuccess: () => { setTitle(''); refresh() },
    onError: err,
  })
  const toggle = useMutation({ mutationFn: (id: number) => api.post<ChecklistItem>(`/api/checklist/${id}/toggle`), onSuccess: replace, onError: err })
  const assign = useMutation({
    mutationFn: (i: ChecklistItem) =>
      api.patch<ChecklistItem>(`/api/checklist/${i.id}`, i.assignee?.id === me?.member.id ? { clearAssignee: true } : { assigneeId: me?.member.id }),
    onSuccess: replace,
    onError: err,
  })
  const del = useMutation({ mutationFn: (id: number) => api.del(`/api/checklist/${id}`), onSuccess: refresh, onError: err })

  const shared = (q.data ?? []).filter((i) => i.kind === 'SHARED')
  const each = (q.data ?? []).filter((i) => i.kind === 'EACH')
  const linked = members.length || 8

  return (
    <div>
      <form className="card" onSubmit={(e) => { e.preventDefault(); if (title.trim()) add.mutate() }}>
        <div className="toggle-row">
          <button type="button" className={kind === 'SHARED' ? 'on' : ''} onClick={() => setKind('SHARED')}>공용 (한 명이 챙김)</button>
          <button type="button" className={kind === 'EACH' ? 'on' : ''} onClick={() => setKind('EACH')}>각자 챙기기</button>
        </div>
        <div className="row mt8">
          <input className="input" placeholder={kind === 'SHARED' ? '예: 블루투스 스피커' : '예: 신분증, 충전기'} value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
          <button className="btn sm" disabled={!title.trim() || add.isPending}>추가</button>
        </div>
      </form>

      {!q.data ? (
        <Spinner />
      ) : q.data.length === 0 ? (
        <Empty>챙길 것들을 적어두세요</Empty>
      ) : (
        <>
          {shared.length > 0 && (
            <>
              <div className="section-h"><span>공용</span><small>{shared.filter((i) => i.done).length}/{shared.length}</small></div>
              <div className="card" style={{ padding: '4px 16px' }}>
                {shared.map((i) => (
                  <div key={i.id} className="list-row">
                    <button className={'check' + (i.done ? '' : ' off')} style={{ background: i.done ? 'var(--ink)' : undefined }} onClick={() => toggle.mutate(i.id)}>✓</button>
                    <span className="grow bold" style={{ fontSize: 14, textDecoration: i.done ? 'line-through' : undefined, opacity: i.done ? 0.5 : 1 }}>{i.title}</span>
                    <button className="row" style={{ gap: 4 }} onClick={() => assign.mutate(i)}>
                      {i.assignee ? (
                        <>
                          <Avatar m={i.assignee} size={24} />
                          <span className="small bold">{i.assignee.name}</span>
                        </>
                      ) : (
                        <span className="chip">내가 챙길게</span>
                      )}
                    </button>
                    <button className="small muted" onClick={() => confirmAsk('지울까요?') && del.mutate(i.id)}>×</button>
                  </div>
                ))}
              </div>
            </>
          )}
          {each.length > 0 && (
            <>
              <div className="section-h"><span>각자 챙기기</span><small>내 체크 {each.filter((i) => i.mine).length}/{each.length}</small></div>
              <div className="card" style={{ padding: '4px 16px' }}>
                {each.map((i) => (
                  <div key={i.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                    <button className={'check' + (i.mine ? '' : ' off')} style={{ background: i.mine ? me?.member.themeColor : undefined }} onClick={() => toggle.mutate(i.id)}>✓</button>
                    <div className="grow">
                      <div className="between">
                        <span className="bold" style={{ fontSize: 14 }}>{i.title}</span>
                        <span className="small bold muted">{i.checkedMemberIds.length}/{linked}</span>
                      </div>
                      <div className="mt8"><Bar value={i.checkedMemberIds.length} total={linked} /></div>
                      <div className="row mt8" style={{ gap: 3 }}>
                        {members.map((m) => (
                          <Avatar key={m.id} m={m} size={20} ring={false} gray={!i.checkedMemberIds.includes(m.id)} />
                        ))}
                      </div>
                    </div>
                    <button className="small muted" onClick={() => confirmAsk('지울까요?') && del.mutate(i.id)}>×</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
