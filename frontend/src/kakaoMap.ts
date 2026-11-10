import { api } from './api'

/* Minimal typing for the parts of the Kakao Maps SDK we use. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Kakao = any

declare global {
  interface Window {
    kakao?: Kakao
  }
}

let loading: Promise<Kakao | null> | null = null

/** Loads the Kakao Maps JS SDK once. Resolves null when no JS key is configured. */
export function loadKakaoMaps(): Promise<Kakao | null> {
  if (loading) return loading
  loading = api
    .get<{ kakaoJsKey: string }>('/api/auth/config')
    .then(
      (cfg) =>
        new Promise<Kakao | null>((resolve) => {
          if (!cfg.kakaoJsKey) return resolve(null)
          if (window.kakao?.maps) return window.kakao.maps.load(() => resolve(window.kakao))
          const s = document.createElement('script')
          s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${cfg.kakaoJsKey}&libraries=services&autoload=false`
          s.onload = () => window.kakao.maps.load(() => resolve(window.kakao))
          s.onerror = () => resolve(null)
          document.head.appendChild(s)
        }),
    )
    .catch(() => null)
  return loading
}

export type PlaceHit = { name: string; address: string; lat: number; lng: number; url: string; category: string }

export function searchPlaces(kakao: Kakao, query: string): Promise<PlaceHit[]> {
  return new Promise((resolve) => {
    const ps = new kakao.maps.services.Places()
    ps.keywordSearch(query, (data: Kakao[], status: string) => {
      if (status !== kakao.maps.services.Status.OK) return resolve([])
      resolve(
        data.slice(0, 10).map((d) => ({
          name: d.place_name,
          address: d.road_address_name || d.address_name,
          lat: Number(d.y),
          lng: Number(d.x),
          url: d.place_url,
          category: d.category_group_code,
        })),
      )
    })
  })
}

/** Maps Kakao category_group_code to our categories. */
export function categoryOf(code: string) {
  if (code === 'FD6') return 'FOOD'
  if (code === 'CE7') return 'CAFE'
  if (code === 'AD5') return 'STAY'
  if (code === 'AT4' || code === 'CT1') return 'SIGHT'
  return 'ETC'
}
