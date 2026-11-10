import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type LoginResponse } from '../api'
import { useAuth } from '../auth'
import { Spinner } from '../components/ui'

export default function KakaoCallback() {
  const nav = useNavigate()
  const { signIn } = useAuth()
  const ran = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (ran.current) return // the code is single-use; StrictMode runs effects twice in dev
    ran.current = true
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) {
      setError(params.get('error_description') ?? '로그인이 취소됐어요')
      return
    }
    api
      .post<LoginResponse>('/api/auth/kakao', { code, redirectUri: `${window.location.origin}/auth/kakao/callback` })
      .then(async (r) => {
        if (r.status === 'NEED_INVITE' && r.signupToken) {
          sessionStorage.setItem('wak_signup', r.signupToken)
          nav('/invite', { replace: true })
          return
        }
        await signIn(r)
        const from = sessionStorage.getItem('wak_from') ?? '/'
        sessionStorage.removeItem('wak_from')
        nav(from, { replace: true })
      })
      .catch((e) => setError(e.message))
  }, [nav, signIn])

  if (error) {
    return (
      <div className="page no-tab center" style={{ paddingTop: '30vh' }}>
        <div className="bold">{error}</div>
        <button className="btn mt16" onClick={() => nav('/login', { replace: true })}>다시 로그인</button>
      </div>
    )
  }
  return <Spinner full />
}
