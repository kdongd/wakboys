import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api'
import { useAuth } from '../../auth'
import { useErrorToast, useToast } from '../../components/Toast'
import { Avatar, Bar, confirmAsk, Name, Sheet, Spinner } from '../../components/ui'
import type { Settlement } from '../../types'
import { useMembers } from '../../useMembers'
import { won } from '../../util'

export default function Settle({ tripId }: { tripId: number }) {
  const { me } = useAuth()
  const { members } = useMembers()
  const qc = useQueryClient()
  const toast = useToast()
  const err = useErrorToast()
  const key = ['settlement', tripId]
  const q = useQuery({ queryKey: key, queryFn: () => api.get<Settlement>(`/api/trips/${tripId}/settlement`) })
  const [adding, setAdding] = useState(false)
  const [pickReceiver, setPickReceiver] = useState(false)
  const refresh = () => {
    qc.invalidateQueries({ queryKey: key })
    qc.invalidateQueries({ queryKey: ['trip', tripId] })
  }

  const sent = useMutation({
    mutationFn: (t: { fromId: number; toId: number }) => api.post(`/api/trips/${tripId}/settlement/sent`, t),
    onSuccess: () => { toast('보냈어요 체크 완료 💸'); refresh() },
    onError: err,
  })
  const unsent = useMutation({
    mutationFn: (t: { fromId: number; toId: number }) => api.del(`/api/trips/${tripId}/settlement/sent?fromId=${t.fromId}&toId=${t.toId}`),
    onSuccess: refresh,
    onError: err,
  })
  const delExpense = useMutation({ mutationFn: (id: number) => api.del(`/api/trip-expenses/${id}`), onSuccess: refresh, onError: err })
  const setReceiver = useMutation({
    mutationFn: (memberId: number) => api.put(`/api/trips/${tripId}/settlement/receiver`, { memberId }),
    onSuccess: () => { setPickReceiver(false); refresh() },
    onError: err,
  })

  if (!q.data) return <Spinner />
  const s = q.data
  const canManage = me?.member.treasurer || me?.member.admin
  const myTransfers = s.transfers.filter((t) => t.from.id === me?.member.id || t.to.id === me?.member.id)

  return (
    <div>
      <div className="card">
        <div className="between small bold muted"><span>총 경비</span><span>1인당 ({s.headcount}명)</span></div>
        <div className="between mt8">
          <div style={{ fontSize: 26, fontWeight: 900 }}>{won(s.total)}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#e45806' }}>{won(s.share)}</div>
        </div>
        {s.transfers.length > 0 && (
          <>
            <div className="mt12"><Bar value={s.sentCount} total={s.transfers.length} /></div>
            <div className="small bold muted mt8">{s.sentCount}명 보냄 · {s.transfers.length - s.sentCount}명 남음</div>
          </>
        )}
      </div>

      {s.receiver && (
        <div className="card">
          <div className="card-h"><span>받는 사람</span>{canManage && <button className="small brown bold" onClick={() => setPickReceiver(true)}>변경</button>}</div>
          <div className="row">
            <Avatar m={s.receiver} size={42} />
            <div className="grow">
              <Name m={s.receiver} />
              <div className="small muted bold">{s.bankInfo ?? '계좌는 회비 탭에서 총무가 등록할 수 있어요'}</div>
            </div>
            {s.bankInfo && (
              <button className="chip" onClick={() => navigator.clipboard?.writeText(s.bankInfo!).then(() => toast('계좌를 복사했어요'))}>복사</button>
            )}
          </div>
        </div>
      )}

      {myTransfers.length > 0 && (
        <div className="card" style={{ boxShadow: `inset 0 0 0 2px ${me?.member.themeColor}` }}>
          <div className="card-h"><span>내 정산</span></div>
          {myTransfers.map((t) => <TransferRow key={t.from.id + ':' + t.to.id} t={t} meId={me!.member.id} onSent={sent.mutate} onUndo={unsent.mutate} />)}
        </div>
      )}

      {s.transfers.length > 0 && (
        <div className="card" style={{ padding: '8px 16px' }}>
          <div className="card-h" style={{ marginTop: 6 }}><span>전체 현황</span></div>
          {s.transfers.map((t) => <TransferRow key={t.from.id + ':' + t.to.id} t={t} meId={me!.member.id} onSent={sent.mutate} onUndo={unsent.mutate} compact />)}
        </div>
      )}

      <div className="section-h"><span>경비 내역</span><small>{s.expenses.length}건</small></div>
      <button className="btn outline" onClick={() => setAdding(true)}>+ 경비 추가</button>
      {s.expenses.length > 0 && (
        <div className="card mt12" style={{ padding: '4px 16px' }}>
          {s.expenses.map((e) => (
            <div key={e.id} className="list-row">
              <Avatar m={e.paidBy} size={30} />
              <div className="grow">
                <div className="bold" style={{ fontSize: 14 }}>{e.title}</div>
                <div className="small muted">{e.paidBy.name} 결제</div>
              </div>
              <span className="bold">{won(e.amount)}</span>
              <button className="small muted" onClick={() => confirmAsk(`「${e.title}」 경비를 지울까요?`) && delExpense.mutate(e.id)}>×</button>
            </div>
          ))}
        </div>
      )}
      {s.total > 0 && (
        <div className="card mt12" style={{ padding: '4px 16px' }}>
          <div className="card-h" style={{ marginTop: 10 }}><span>사람별</span><small>낸 돈 − 1인당</small></div>
          {s.members.map((l) => (
            <div key={l.member.id} className="list-row">
              <Avatar m={l.member} size={26} />
              <span className="grow bold" style={{ fontSize: 13 }}>{l.member.name}</span>
              <span className="small muted">{won(l.paid)}</span>
              <span className="small bold" style={{ width: 90, textAlign: 'right', color: l.net >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {l.net >= 0 ? '+' : ''}{l.net.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {adding && <AddExpense tripId={tripId} meId={me!.member.id} onClose={() => setAdding(false)} onDone={() => { setAdding(false); refresh() }} />}
      <Sheet open={pickReceiver} onClose={() => setPickReceiver(false)} title="받는 사람">
        <div className="mt12">
          {members.map((m) => (
            <button key={m.id} className="list-row" style={{ width: '100%' }} onClick={() => setReceiver.mutate(m.id)}>
              <Avatar m={m} size={32} />
              <span className="grow" style={{ textAlign: 'left' }}><Name m={m} /></span>
              {s.receiver?.id === m.id && <span className="chip on">현재</span>}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  )
}

function TransferRow({ t, meId, onSent, onUndo, compact }: {
  t: Settlement['transfers'][number]
  meId: number
  onSent: (x: { fromId: number; toId: number }) => void
  onUndo: (x: { fromId: number; toId: number }) => void
  compact?: boolean
}) {
  const mine = t.from.id === meId
  const ids = { fromId: t.from.id, toId: t.to.id }
  return (
    <div className="list-row">
      <Avatar m={t.from} size={compact ? 28 : 36} />
      <span className="small muted">→</span>
      <Avatar m={t.to} size={compact ? 22 : 28} />
      <div className="grow">
        <div className="bold" style={{ fontSize: compact ? 13 : 15 }}>{t.from.name} → {t.to.name}</div>
        <div className="small bold" style={{ color: '#e45806' }}>{won(t.amount)}</div>
        {t.changed && <div className="small bold" style={{ color: 'var(--red)' }}>경비가 바뀌었어요 (체크 당시 {won(t.sentAmount ?? 0)})</div>}
      </div>
      {t.sent ? (
        mine ? (
          <button className="chip green" onClick={() => confirmAsk('보냈어요 체크를 취소할까요?') && onUndo(ids)}>보냈어요 ✓</button>
        ) : (
          <span className="chip green">보냈어요 ✓</span>
        )
      ) : mine ? (
        <button className="btn sm" onClick={() => confirmAsk(`${t.to.name}님에게 ${won(t.amount)} 보냈나요?`) && onSent(ids)}>보냈어요</button>
      ) : (
        <span className="chip">아직</span>
      )}
    </div>
  )
}

function AddExpense({ tripId, meId, onClose, onDone }: { tripId: number; meId: number; onClose: () => void; onDone: () => void }) {
  const { members } = useMembers()
  const err = useErrorToast()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(meId)
  const save = useMutation({
    mutationFn: () => api.post(`/api/trips/${tripId}/expenses`, { title, amount: Number(amount.replace(/[^0-9]/g, '')), paidBy }),
    onSuccess: onDone,
    onError: err,
  })
  const n = Number(amount.replace(/[^0-9]/g, ''))
  return (
    <Sheet open onClose={onClose} title="경비 추가">
      <label className="label">항목</label>
      <input className="input" placeholder="예: 숙소, 장보기, 렌트카" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
      <label className="label">금액</label>
      <input className="input" inputMode="numeric" placeholder="0" value={n ? n.toLocaleString() : ''} onChange={(e) => setAmount(e.target.value)} />
      <label className="label">결제한 사람</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {members.map((m) => (
          <button key={m.id} className="center" onClick={() => setPaidBy(m.id)} style={{ opacity: paidBy === m.id ? 1 : 0.45 }}>
            <Avatar m={m} size={44} ring={paidBy === m.id} />
            <div className="small bold mt8" style={{ marginTop: 4 }}>{m.name}</div>
          </button>
        ))}
      </div>
      <button className="btn mt24" disabled={!title.trim() || !n || save.isPending} onClick={() => save.mutate()}>추가</button>
    </Sheet>
  )
}
