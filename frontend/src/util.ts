export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

export const seasonEn = (s: string) => (s === 'SUMMER' ? 'SUMMER' : 'WINTER')
export const seasonKo = (s: string) => (s === 'SUMMER' ? '여름' : '겨울')

/** Edition box colours by season. */
export const seasonColors = (s: string) =>
  s === 'SUMMER' ? { from: '#ffc27a', to: '#ff8a5c', ink: '#fff' } : { from: '#8fc4ff', to: '#6a86f5', ink: '#fff' }

export function md(date?: string) {
  if (!date) return ''
  const [, m, d] = date.split('-')
  return `${Number(m)}.${Number(d)}`
}

export function range(start?: string, end?: string) {
  if (!start) return '날짜 미정'
  if (!end || end === start) return md(start)
  return `${md(start)} – ${md(end)}`
}

export function nights(start?: string, end?: string) {
  if (!start || !end) return null
  const n = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000)
  return n > 0 ? `${n}박 ${n + 1}일` : '당일'
}

export function ago(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`
  const d = new Date(iso)
  return `${d.getFullYear() === new Date().getFullYear() ? '' : d.getFullYear() + '.'}${d.getMonth() + 1}.${d.getDate()}`
}

export function ymLabel(ym: string) {
  return `${Number(ym.split('-')[1])}월`
}

export function ddayLabel(dday?: number, status?: string) {
  if (status === 'ONGOING') return 'NOW'
  if (status === 'DONE') return 'DONE'
  if (dday == null) return 'TBD'
  return dday === 0 ? 'D-DAY' : `D-${dday}`
}

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

/** true when dark text reads better than white on this colour */
export function isLight(hex: string) {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return 0.299 * r + 0.587 * g + 0.114 * b > 170
}
