import { api } from './api'

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** iOS only allows web push for apps added to the home screen. */
export const needsInstall = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window.matchMedia('(display-mode: standalone)').matches)

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'))
}

export async function currentSubscription() {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return reg ? reg.pushManager.getSubscription() : null
}

export async function enablePush() {
  const cfg = await api.get<{ enabled: boolean; publicKey: string }>('/api/push/public-key')
  if (!cfg.enabled) throw new Error('서버에 알림 설정이 아직 안 돼 있어요')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('알림 권한이 꺼져 있어요. 설정에서 허용해주세요')
  const reg = await registration()
  await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(cfg.publicKey) }))
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  await api.post('/api/push/subscribe', { endpoint: json.endpoint, keys: json.keys })
}

export async function disablePush() {
  const sub = await currentSubscription()
  if (!sub) return
  await api.post('/api/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {})
  await sub.unsubscribe()
}
