import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { useAuth } from '../auth'
import { useErrorToast, useToast } from '../components/Toast'
import { Avatar, confirmAsk, Empty, Sheet, Spinner } from '../components/ui'
import type { DuesOverview } from '../types'
import { won, ymLabel } from '../util'

export default function Dues() {
  const { me } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const err = useErrorToast()
  const [year, setYear] = useState(new Date().getFullYear())
  const key = ['dues', year]
  const q = useQuery({ queryKey: key, queryFn: () => api.get<DuesOverview>(`/api/dues?year=${year}`) })
  const [addOpen, setAddOpen] = useState(false)
  const [cfgOpen, setCfgOpen] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const canManage = !!(me?.member.treasurer || me?.member.admin)

  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth
  }, [q.data])

  const pay = useMutation({
    mutationFn: (v: { memberId: number; ym: string; paid: boolean }) => api.put('/api/dues/payments', v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dues'] })
      qc.invalidateQueries({ queryKey: ['home'] })
    },
    onError: err,
  })
  const delExp = useMutation({
    mutationFn: (id: number) => api.del(`/api/dues/expenses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dues'] }),
    onError: err,
  })

  if (!q.data) return <div className="page"><Spinner /></div>
  const d = q.data
  const paid = new Set(d.payments.map((p) => `${p.memberId}:${p.ym}`))
  const thisMonthPaid = d.members.filter((m) => paid.has(`${m.id}:${d.currentYm}`)).length

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <div className="eyebrow">DUES</div>
          <div className="title">회비</div>
        </div>
        <button className="chip" style={{ background: '#fff' }} onClick={() => (canManage ? setCfgOpen(true) : undefined)}>
          월 {won(d.config.monthlyAmount)}{canManage ? ' · 설정' : ''}
        </button>
      </div>

      <div className="box" style={{ background: 'linear-gradient(160deg,#2b2d38,#14151b)', padding: 18 }}>
        <div className="small bold" style={{ opacity: 0.7 }}>모임 통장 잔액</div>
        <div style={{ fontSize: 32, fontWeight: 900, marginTop: 4 }}>{won(d.balance)}</div>
        <div className="row mt12" style={{ gap: 6 }}>
          <span className="chip" style={{ background: 'rgba(61,220,132,.16)', color: '#5fe39b' }}>이번 달 +{d.monthIncome.toLocaleString()}</span>
          <span className="chip" style={{ background: 'rgba(255,90,90,.16)', color: '#ff8a8a' }}>지출 −{d.monthExpense.toLocaleString()}</span>
        </div>
        {d.config.bankInfo && (
          <button className="small bold mt12" style={{ opacity: 0.8, display: 'block' }}
                  onClick={() => navigator.clipboard?.writeText(d.config.bankInfo!).then(() => toast('계좌를 복사했어요'))}>
            {d.config.bankInfo} · 복사
          </button>
        )}
      </div>

      <div className="card mt12" style={{ padding: '14px 10px' }}>
        <div className="between" style={{ padding: '0 6px 8px' }}>
          <div className="row" style={{ gap: 8 }}>
            <button className="bold brown" onClick={() => setYear(year - 1)}>‹</button>
            <span className="bold">{year}</span>
            <button className="bold brown" onClick={() => setYear(year + 1)} disabled={year >= new Date().getFullYear()}>›</button>
          </div>
          <span className="small bold brown">{canManage ? '칸을 눌러 납부 체크' : `이번 달 ${thisMonthPaid}/8 · 총무가 확인해요`}</span>
        </div>
        {d.months.length === 0 ? (
          <Empty>이 해에는 기록이 없어요</Empty>
        ) : (
          <div className="row" style={{ alignItems: 'flex-start', gap: 0 }}>
            <table className="dues-table" style={{ width: 92, flex: 'none' }}>
              <thead><tr><th style={{ textAlign: 'left', paddingLeft: 6 }}>&nbsp;</th></tr></thead>
              <tbody>
                {d.members.map((m) => (
                  <tr key={m.id}>
                    <td style={{ height: 36 }}>
                      <div className="row" style={{ gap: 6, paddingLeft: 4 }}>
                        <Avatar m={m} size={24} />
                        <span className="bold" style={{ fontSize: 12 }}>{m.name}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="scroll-x grow" ref={scroller}>
              <table className="dues-table" style={{ width: Math.max(d.months.length * 44, 100) }}>
                <thead>
                  <tr>{d.months.map((ym) => <th key={ym} style={{ color: ym === d.currentYm ? 'var(--ink)' : undefined }}>{ymLabel(ym)}</th>)}</tr>
                </thead>
                <tbody>
                  {d.members.map((m) => (
                    <tr key={m.id}>
                      {d.months.map((ym) => {
                        const on = paid.has(`${m.id}:${ym}`)
                        return (
                          <td key={ym} style={{ height: 36 }}>
                            <button
                              className={'check' + (on ? '' : ' off')}
                              style={{ background: on ? m.themeColor : undefined, cursor: canManage ? 'pointer' : 'default' }}
                              disabled={!canManage || pay.isPending}
                              onClick={() => {
                                if (!canManage) return
                                const msg = on ? `${m.name} ${ymLabel(ym)} 납부를 취소할까요?` : `${m.name} ${ymLabel(ym)} 회비 입금 확인했나요?`
                                if (confirmAsk(msg)) pay.mutate({ memberId: m.id, ym, paid: !on })
                              }}
                            >
                              {on ? '✓' : '–'}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="section-h">
        <span>지출 내역</span>
        {canManage && <button className="small bold brown" onClick={() => setAddOpen(true)}>+ 지출 추가</button>}
      </div>
      {d.expenses.length === 0 ? (
        <Empty>아직 지출이 없어요</Empty>
      ) : (
        <div className="card" style={{ padding: '4px 16px' }}>
          {d.expenses.map((e) => (
            <div key={e.id} className="list-row">
              <div className="grow">
                <div className="bold" style={{ fontSize: 14 }}>{e.title}</div>
                <div className="small muted">{e.spentOn.replace(/-/g, '.')}{e.createdBy && ` · ${e.createdBy.name}`}</div>
              </div>
              <span className="bold" style={{ color: 'var(--red)' }}>−{e.amount.toLocaleString()}</span>
              {canManage && <button className="small muted" onClick={() => confirmAsk('지출을 지울까요?') && delExp.mutate(e.id)}>×</button>}
            </div>
          ))}
        </div>
      )}

      {addOpen && <AddExpense onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); qc.invalidateQueries({ queryKey: ['dues'] }) }} />}
      {cfgOpen && <ConfigSheet cfg={d.config} onClose={() => setCfgOpen(false)} onDone={() => { setCfgOpen(false); qc.invalidateQueries({ queryKey: ['dues'] }) }} />}
    </div>
  )
}

function AddExpense({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const err = useErrorToast()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [spentOn, setSpentOn] = useState(new Date().toISOString().slice(0, 10))
  const n = Number(amount.replace(/[^0-9]/g, ''))
  const save = useMutation({ mutationFn: () => api.post('/api/dues/expenses', { title, amount: n, spentOn }), onSuccess: onDone, onError: err })
  return (
    <Sheet open onClose={onClose} title="지출 추가">
      <label className="label">내용</label>
      <input className="input" placeholder="예: 생일 케이크" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
      <label className="label">금액</label>
      <input className="input" inputMode="numeric" value={n ? n.toLocaleString() : ''} onChange={(e) => setAmount(e.target.value)} />
      <label className="label">날짜</label>
      <input className="input" type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
      <button className="btn mt24" disabled={!title.trim() || !n || save.isPending} onClick={() => save.mutate()}>추가</button>
    </Sheet>
  )
}

function ConfigSheet({ cfg, onClose, onDone }: { cfg: DuesOverview['config']; onClose: () => void; onDone: () => void }) {
  const err = useErrorToast()
  const [monthly, setMonthly] = useState(String(cfg.monthlyAmount))
  const [initial, setInitial] = useState(String(cfg.initialBalance))
  const [bank, setBank] = useState(cfg.bankInfo ?? '')
  const [start, setStart] = useState(cfg.startYm)
  const num = (s: string) => Number(s.replace(/[^0-9-]/g, ''))
  const save = useMutation({
    mutationFn: () => api.patch('/api/dues/config', { monthlyAmount: num(monthly), initialBalance: num(initial), bankInfo: bank, startYm: start }),
    onSuccess: onDone,
    onError: err,
  })
  return (
    <Sheet open onClose={onClose} title="회비 설정">
      <label className="label">월 회비</label>
      <input className="input" inputMode="numeric" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
      <label className="label">앱 시작 전 통장 잔액</label>
      <input className="input" inputMode="numeric" value={initial} onChange={(e) => setInitial(e.target.value)} />
      <label className="label">회비 계좌 (정산 받는 계좌로도 표시)</label>
      <input className="input" placeholder="예: 카카오뱅크 3333-01-1234567 박민훈" value={bank} maxLength={100} onChange={(e) => setBank(e.target.value)} />
      <label className="label">기록 시작 월</label>
      <input className="input" type="month" value={start} onChange={(e) => setStart(e.target.value)} />
      <button className="btn mt24" disabled={save.isPending} onClick={() => save.mutate()}>저장</button>
    </Sheet>
  )
}
