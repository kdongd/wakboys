import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type LoginResponse } from '../api'
import { useAuth } from '../auth'
import { useErrorToast } from '../components/Toast'
import { img } from '../members'
import type { Member } from '../types'

export default function Invite() {
  const nav = useNavigate()
  const { signIn } = useAuth()
  const err = useErrorToast()
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState<Member | null>(null)
  const [busy, setBusy] = useState(false)
  const signupToken = sessionStorage.getItem('wak_signup')

  if (!signupToken) {
    return (
      <div className="page no-tab center" style={{ paddingTop: '30vh' }}>
        <div className="bold">카카오 로그인부터 해주세요</div>
        <button className="btn mt16" onClick={() => nav('/login', { replace: true })}>로그인으로</button>
      </div>
    )
  }

  const check = async () => {
    setBusy(true)
    try {
      const r = await api.post<{ member: Member }>('/api/auth/invite/preview', { signupToken, code })
      setPreview(r.member)
    } catch (e) {
      err(e)
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    setBusy(true)
    try {
      const r = await api.post<LoginResponse>('/api/auth/invite/confirm', { signupToken, code })
      sessionStorage.removeItem('wak_signup')
      await signIn(r)
      nav('/', { replace: true })
    } catch (e) {
      err(e)
      setBusy(false)
    }
  }

  if (preview) {
    return (
      <div className="page no-tab" style={{ paddingTop: '8vh' }}>
        <div className="center">
          <div className="eyebrow">YOUR FIGURE</div>
          <div className="title mt8">{preview.name}님 맞으세요?</div>
        </div>
        <div className="box mt24" style={{ height: 380, background: `linear-gradient(170deg, ${preview.themeColor}, #191b22 130%)` }}>
          <div className="window" style={{ left: '50%', transform: 'translateX(-50%)', width: 220, top: 20, bottom: 20 }}>
            <img src={img.full(preview.slug)} alt="" style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', height: '92%' }} />
            <div className="gloss" />
          </div>
        </div>
        <button className="btn mt24" disabled={busy} onClick={confirm}>네, 제가 {preview.name}이에요</button>
        <button className="btn light mt8" disabled={busy} onClick={() => setPreview(null)}>아니에요, 코드를 다시 볼게요</button>
      </div>
    )
  }

  return (
    <div className="page no-tab" style={{ paddingTop: '14vh' }}>
      <div className="eyebrow">INVITE CODE</div>
      <div className="title mt8">받은 초대 코드를<br />입력해주세요</div>
      <div className="muted bold small mt12">코드는 한 사람당 하나, 내 캐릭터에 연결돼 있어요</div>
      <input
        className="input code mt24"
        style={{ fontSize: 22, textAlign: 'center', padding: 18 }}
        placeholder="WAK-XXXXXX"
        value={code}
        autoCapitalize="characters"
        autoComplete="off"
        onChange={(e) => setCode(e.target.value.toUpperCase())}
      />
      <button className="btn mt16" disabled={busy || code.trim().length < 6} onClick={check}>확인</button>
    </div>
  )
}
