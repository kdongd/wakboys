import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, hasToken, refresh, setAccessToken, setLoggedOutHandler, type LoginResponse } from './api'
import { queryClient } from './queryClient'
import type { MemberCard } from './types'

type AuthState = {
  me: MemberCard | null
  ready: boolean
  signIn: (r: LoginResponse) => Promise<void>
  signOut: () => Promise<void>
  reload: () => Promise<void>
}

const Ctx = createContext<AuthState>(null as unknown as AuthState)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MemberCard | null>(null)
  const [ready, setReady] = useState(false)

  const reload = useCallback(async () => {
    try {
      setMe(await api.get<MemberCard>('/api/me'))
    } catch {
      setMe(null)
    }
  }, [])

  useEffect(() => {
    setLoggedOutHandler(() => setMe(null))
    ;(async () => {
      if (hasToken() || (await refresh())) await reload()
      setReady(true)
    })()
  }, [reload])

  const signIn = useCallback(
    async (r: LoginResponse) => {
      setAccessToken(r.accessToken ?? null)
      await reload()
    },
    [reload],
  )

  const signOut = useCallback(async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {
      /* ignore */
    }
    setAccessToken(null)
    queryClient.clear()
    setMe(null)
  }, [])

  return <Ctx.Provider value={{ me, ready, signIn, signOut, reload }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
