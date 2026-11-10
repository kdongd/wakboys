import type { Member } from './types'

/**
 * Access token lives in memory + localStorage (1h). The refresh token is an httpOnly
 * cookie scoped to /api/auth, rotated on every refresh (30 days, sliding).
 */
const KEY = 'wak_at'
let accessToken: string | null = localStorage.getItem(KEY)
let refreshing: Promise<boolean> | null = null
let onLoggedOut: () => void = () => {}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function setAccessToken(t: string | null) {
  accessToken = t
  if (t) localStorage.setItem(KEY, t)
  else localStorage.removeItem(KEY)
}

export function hasToken() {
  return !!accessToken
}

export function setLoggedOutHandler(fn: () => void) {
  onLoggedOut = fn
}

export type LoginResponse = { status: 'OK' | 'NEED_INVITE'; accessToken?: string; member?: Member; signupToken?: string }

export async function refresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
      .then(async (r) => {
        if (!r.ok) return false
        const body = (await r.json()) as LoginResponse
        setAccessToken(body.accessToken ?? null)
        return true
      })
      .catch(() => false)
      .finally(() => {
        setTimeout(() => (refreshing = null), 0)
      })
  }
  return refreshing
}

async function request<T>(method: string, url: string, body?: unknown, retry = true): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
  const res = await fetch(url, {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 401 && retry && !url.startsWith('/api/auth/')) {
    if (await refresh()) return request<T>(method, url, body, false)
    setAccessToken(null)
    onLoggedOut()
    throw new ApiError(401, '다시 로그인해주세요')
  }
  if (!res.ok) {
    let msg = '문제가 생겼어요. 잠시 후 다시 시도해주세요'
    try {
      const j = await res.json()
      if (j?.message) msg = j.message
    } catch {
      /* no body */
    }
    throw new ApiError(res.status, msg)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  put: <T>(url: string, body?: unknown) => request<T>('PUT', url, body ?? {}),
  patch: <T>(url: string, body?: unknown) => request<T>('PATCH', url, body ?? {}),
  del: <T>(url: string) => request<T>('DELETE', url),
}
