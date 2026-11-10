import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { useErrorToast, useToast } from '../components/Toast'
import { Avatar, Back, Name } from '../components/ui'
import { currentSubscription, disablePush, enablePush, needsInstall, pushSupported } from '../push'

export default function Me() {
  const { me, signOut, reload } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const err = useErrorToast()
  const [month, setMonth] = useState(me?.birthMonth ? String(me.birthMonth) : '')
  const [day, setDay] = useState(me?.birthDay ? String(me.birthDay) : '')
  const [pushOn, setPushOn] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    currentSubscription().then((s) => setPushOn(!!s)).catch(() => setPushOn(false))
  }, [])

  const saveBirthday = useMutation({
    mutationFn: () => api.patch('/api/me', { birthMonth: month ? Number(month) : null, birthDay: day ? Number(day) : null }),
    onSuccess: async () => {
      await reload()
      qc.invalidateQueries({ queryKey: ['members'] })
      qc.invalidateQueries({ queryKey: ['home'] })
      toast('생일을 저장했어요 🎂')
    },
    onError: err,
  })

  const togglePush = async () => {
    setBusy(true)
    try {
      if (pushOn) {
        await disablePush()
        setPushOn(false)
        toast('알림을 껐어요')
      } else {
        await enablePush()
        setPushOn(true)
        toast('알림을 켰어요 🔔')
      }
    } catch (e) {
      err(e)
    } finally {
      setBusy(false)
    }
  }

  if (!me) return null
  return (
    <div className="page no-tab">
      <Back label="뒤로" />
      <div className="card row mt8">
        <Avatar m={me.member} size={56} />
        <div className="grow">
          <div style={{ fontSize: 18 }}><Name m={me.member} /></div>
          <div className="small muted bold">{me.member.admin ? '운영자' : me.member.treasurer ? '총무' : '멤버'}</div>
        </div>
        <Link to={`/members/${me.member.slug}`} className="chip">내 피규어</Link>
      </div>

      <div className="section-h"><span>생일</span></div>
      <div className="card">
        <div className="row">
          <select className="select" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">월</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}월</option>)}
          </select>
          <select className="select" value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">일</option>
            {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}일</option>)}
          </select>
          <button className="btn sm" disabled={saveBirthday.isPending} onClick={() => saveBirthday.mutate()}>저장</button>
        </div>
        <div className="small muted bold mt8">생일 아침 9시에 다른 멤버들에게 알림이 가요</div>
      </div>

      <div className="section-h"><span>알림</span></div>
      <div className="card">
        {!pushSupported() ? (
          <div className="small bold muted">이 브라우저는 알림을 지원하지 않아요</div>
        ) : needsInstall() ? (
          <div className="small bold" style={{ lineHeight: 1.6 }}>
            아이폰은 홈 화면에 추가해야 알림을 받을 수 있어요.<br />
            Safari 공유 버튼 → <b>홈 화면에 추가</b> → 추가된 앱에서 다시 열어주세요.
          </div>
        ) : (
          <>
            <div className="between">
              <div>
                <div className="bold">푸시 알림</div>
                <div className="small muted bold mt8" style={{ marginTop: 2 }}>새 투표·사진·소식, 회비 알림, 정산</div>
              </div>
              <button className={'btn sm' + (pushOn ? ' light' : '')} disabled={busy || pushOn == null} onClick={togglePush}>
                {pushOn ? '끄기' : '켜기'}
              </button>
            </div>
            {pushOn && (
              <button className="btn light sm mt12" onClick={() => api.post<{ sent: number }>('/api/push/test').then((r) => toast(r.sent ? '테스트 알림을 보냈어요' : '보낼 기기가 없어요')).catch(err)}>
                테스트 알림 보내기
              </button>
            )}
          </>
        )}
      </div>

      {me.member.admin && (
        <>
          <div className="section-h"><span>운영자</span></div>
          <Link to="/admin" className="card between" style={{ display: 'flex' }}>
            <span className="bold">멤버 · 초대 코드 · 총무 관리</span>
            <span className="brown bold">›</span>
          </Link>
        </>
      )}

      <button className="btn outline mt24" onClick={signOut}>로그아웃</button>
      <div className="center small muted bold mt12">다시 로그인해도 캐릭터와 기록은 그대로예요</div>
    </div>
  )
}
