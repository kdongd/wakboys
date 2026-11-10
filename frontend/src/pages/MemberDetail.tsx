import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import { Back, Spinner } from '../components/ui'
import { CHARACTERS, img, orderIndex } from '../members'
import type { MemberCard } from '../types'
import { isLight } from '../util'

type Detail = {
  card: MemberCard
  stats: { photos: number; videos: number; comments: number; posts: number; trips: number; duesPerfect: boolean }
}

export default function MemberDetail() {
  const slug = useParams().slug!
  const q = useQuery({ queryKey: ['member', slug], queryFn: () => api.get<Detail>(`/api/members/${slug}`) })

  if (!q.data) return <div className="page no-tab"><Back to="/members" label="컬렉션" /><Spinner /></div>
  const { card, stats } = q.data
  const m = card.member
  const info = CHARACTERS[m.slug]
  const icon = img.icon(m.slug)
  const no = orderIndex(m.slug) + 1

  return (
    <div className="page no-tab">
      <Back to="/members" label="컬렉션" />
      <div className="box mt8" style={{ background: `linear-gradient(170deg, ${m.themeColor}, ${m.themeColor}dd 55%, #191b22 160%)`, paddingBottom: 14, boxShadow: '0 10px 24px rgba(0,0,0,.18)' }}>
        <div style={{ background: '#191b22', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: isLight(m.themeColor) || m.themeColor === '#e45806' || m.themeColor === '#cc1b1b' ? m.themeColor : '#c9c9ff' }}>WAKBOYS FIGURE</div>
            <div style={{ fontSize: 21, fontWeight: 900 }}>No.{String(no).padStart(2, '0')} {m.name}</div>
          </div>
          <div className="row" style={{ gap: 4 }}>
            {m.admin && <span className="badge admin">운영자</span>}
            {m.treasurer && <span className="badge" style={{ background: '#fff', color: '#191b22' }}>총무</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '14px 14px 0' }}>
          <div className="window static" style={{ flex: 1, height: 360 }}>
            <img src={img.full(m.slug)} alt="" style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', height: '92%' }} />
            <div className="gloss" />
          </div>
          <div style={{ width: 112, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {icon && (
              <>
                <div className="window static" style={{ height: 130 }}>
                  <img src={icon} alt="" style={{ position: 'absolute', inset: 12, width: 'calc(100% - 24px)', height: 'calc(100% - 24px)', objectFit: 'contain' }} />
                  <div className="gloss" />
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.06em', opacity: 0.9, color: isLight(m.themeColor) ? '#191b22' : '#fff' }}>
                  ACCESSORY
                  <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 0, marginTop: 2 }}>{info?.prop}</div>
                </div>
              </>
            )}
            <div style={{ background: '#191b22', borderRadius: 12, padding: 10, fontSize: 12, fontWeight: 800, lineHeight: 1.7, marginTop: 'auto' }}>
              {card.birthMonth ? `생일 ${card.birthMonth}.${card.birthDay}` : '생일 미등록'}
              <br />여행 {stats.trips}회
              <br />사진 {stats.photos}
              {stats.videos > 0 && ` · 영상 ${stats.videos}`}
              <br />댓글 {stats.comments}
              <br />{stats.duesPerfect ? '회비 개근 🏅' : '회비 미납 있음'}
            </div>
          </div>
        </div>

        <div style={{ margin: '12px 14px 0', background: 'rgba(255,255,255,.88)', borderRadius: 14, padding: '10px 12px', color: '#191b22' }}>
          <div className="small bold brown">표정 파츠 {info?.expressions.length ?? 4}종 포함</div>
          <div className="between mt8">
            {(info?.expressions ?? []).map((e) => (
              <div key={e.file} className="center" style={{ fontSize: 10, fontWeight: 800, color: '#6c665a' }}>
                <img src={img.expression(m.slug, e.file)} alt={e.label} style={{ height: 56, margin: '0 auto 2px' }} />
                {e.label}
              </div>
            ))}
          </div>
        </div>
      </div>
      {!card.linked && <div className="center small muted bold mt16">아직 가입하지 않은 멤버예요</div>}
    </div>
  )
}
