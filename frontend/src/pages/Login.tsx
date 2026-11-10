import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, type LoginResponse } from '../api'
import { useAuth } from '../auth'
import { Clouds, GroupShot, Logo } from '../components/World'
import { useErrorToast } from '../components/Toast'
import { ORDER } from '../members'

type Config = { kakaoRestApiKey: string; kakaoJsKey: string; devLogin: boolean }


export default function Login() {
  const cfg = useQuery({ queryKey: ['auth-config'], queryFn: () => api.get<Config>('/api/auth/config') })
  const loc = useLocation()
  const nav = useNavigate()
  const { signIn } = useAuth()
  const err = useErrorToast()
  const from = (loc.state as { from?: string } | null)?.from ?? '/'

  const kakao = () => {
    const key = cfg.data?.kakaoRestApiKey
    if (!key) return err(new Error('카카오 로그인이 아직 설정되지 않았어요'))
    sessionStorage.setItem('wak_from', from)
    const redirect = `${window.location.origin}/auth/kakao/callback`
    window.location.href =
      `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${encodeURIComponent(key)}` +
      `&redirect_uri=${encodeURIComponent(redirect)}`
  }

  const dev = async (slug: string) => {
    try {
      const r = await api.post<LoginResponse>('/api/auth/dev-login', { slug })
      await signIn(r)
      nav(from, { replace: true })
    } catch (e) {
      err(e)
    }
  }

  // bigger figures on taller phones, but never wider than the screen
  const groupScale = Math.max(1.5, Math.min(2.1, (window.innerHeight - 380) / 220, (Math.min(window.innerWidth, 480) - 32) / 165))

  return (
    <div className="login-world">
      <Clouds />
      <span className="cloud" style={{ top: 150, left: 30, transform: 'scale(.7)', opacity: 0.85 }} />
      <div className="login-logo">
        <Logo size={50} />
      </div>
      <div className="login-hill" />
      <div className="login-group">
        <GroupShot back={groupScale} front={groupScale * 1.17} />
      </div>
      <div className="login-bottom">
        <button className="btn kakao" onClick={kakao}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#191919" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7l-1 3.6c-.1.4.3.7.6.5l4.2-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.6 10-8S17.5 3 12 3z" /></svg>
          카카오로 시작하기
        </button>
        <div className="center small mt12 bold" style={{ color: '#2f6b2a' }}>처음이면 운영자에게 받은 개인 초대 코드를 입력하게 돼요</div>
        {cfg.data?.devLogin && (
          <div className="card mt16">
            <div className="card-h">개발용 로그인</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ORDER.map((s) => (
                <button key={s} className="chip" onClick={() => dev(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
