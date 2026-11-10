import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { useAuth } from '../auth'
import { MiniBox } from '../components/Edition'
import { MediaGrid, MediaViewer } from '../components/Media'
import { ReactionStack } from '../components/Reactions'
import { Hero, Logo, SectionTitle } from '../components/World'
import { Avatar, Empty, Spinner } from '../components/ui'
import { orderIndex } from '../members'
import type { Home as HomeData } from '../types'
import { ago, ddayLabel, range, seasonKo, ymLabel } from '../util'

const TILES = [
  { to: '/dues', label: '회비', icon: '💰', bg: '#fff3c4', ring: '#f5d76e' },
  { to: '/trips', label: '여행', icon: '🗺️', bg: '#dff5dc', ring: '#a9dea2' },
  { to: '/feed', label: '소식', icon: '💬', bg: '#e3e9ff', ring: '#b4c2fb' },
  { to: '/members', label: '멤버', icon: '⭐', bg: '#ffe3ec', ring: '#f7b3c8' },
]

export default function Home() {
  const { me } = useAuth()
  const nav = useNavigate()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['home'], queryFn: () => api.get<HomeData>('/api/home') })
  const [viewer, setViewer] = useState<number | null>(null)
  const d = q.data

  return (
    <div className="page">
      <div className="topbar" style={{ marginBottom: 8 }}>
        <Logo size={34} />
        {me && <Avatar m={me.member} size={42} onClick={() => nav('/me')} />}
      </div>

      <Hero height={270} />

      {!d ? (
        <Spinner />
      ) : (
        <>
          {d.nextTrip ? (
            <Link to={`/trips/${d.nextTrip.trip.id}`} className="card notice">
              <span className="notice-icon">✈️</span>
              <div className="grow">
                <div className="small bold" style={{ color: 'var(--purple)' }}>
                  다음 여행 · {d.nextTrip.trip.year} {seasonKo(d.nextTrip.trip.season)}
                </div>
                <div className="bold ellipsis" style={{ fontSize: 17, marginTop: 2 }}>{d.nextTrip.trip.title}</div>
                <div className="small muted bold" style={{ marginTop: 2 }}>
                  {d.nextTrip.trip.destination ?? '여행지 미정'} · {range(d.nextTrip.trip.startDate, d.nextTrip.trip.endDate)}
                </div>
              </div>
              <span className="d-badge">{ddayLabel(d.nextTrip.trip.dday, d.nextTrip.trip.status)}</span>
            </Link>
          ) : (
            <Link to="/trips?new=1" className="card notice">
              <span className="notice-icon">🧳</span>
              <div className="grow">
                <div className="bold">다음 여행이 아직 없어요</div>
                <div className="small muted bold" style={{ marginTop: 2 }}>여름·겨울 여행을 만들고 투표부터 시작해요</div>
              </div>
              <span className="bold" style={{ color: 'var(--purple)' }}>›</span>
            </Link>
          )}
          {d.nextTrip && (d.nextTrip.openPolls > 0 || d.nextTrip.checklist.total > 0) && (
            <div className="row mt8" style={{ gap: 6, padding: '0 4px' }}>
              {d.nextTrip.openPolls > 0 && <span className="chip on">🗳️ 투표 {d.nextTrip.openPolls}개 진행 중</span>}
              {d.nextTrip.checklist.total > 0 && (
                <span className="chip">🎒 준비물 {d.nextTrip.checklist.done}/{d.nextTrip.checklist.total}</span>
              )}
            </div>
          )}

          <div className="tiles mt12">
            {TILES.map((t) => (
              <Link key={t.to} to={t.to} className="tile" style={{ background: t.bg, boxShadow: `0 4px 0 ${t.ring}` }}>
                <span className="tile-icon">{t.icon}</span>
                {t.label}
              </Link>
            ))}
          </div>

          <Link to="/dues" className="card mt12" style={{ display: 'block' }}>
            <div className="card-h">
              <span>🪙 {ymLabel(d.dues.ym)} 회비 수집</span>
              <small>
                {d.dues.paid.length} / {d.dues.paid.length + d.dues.unpaid.length}
              </small>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5 }}>
              {[...d.dues.paid.map((m) => ({ m, paid: true })), ...d.dues.unpaid.map((m) => ({ m, paid: false }))]
                .sort((a, b) => orderIndex(a.m.slug) - orderIndex(b.m.slug))
                .map(({ m, paid }) =>
                  paid ? (
                    <div key={m.id} className="slot" style={{ background: m.themeColor }}>
                      <img src={`/characters/${m.slug}/profile.webp`} alt={m.name} />
                    </div>
                  ) : (
                    <div key={m.id} className="slot empty" title={m.name}>?</div>
                  ),
                )}
            </div>
          </Link>

          {d.birthdays.length > 0 && (
            <div className="card mt12">
              {d.birthdays.slice(0, 2).map((b) => (
                <Link key={b.member.id} to={`/members/${b.member.slug}`} className="row" style={{ padding: '4px 0' }}>
                  <Avatar m={b.member} size={42} />
                  <div className="grow">
                    <div className="bold">{b.dday === 0 ? `오늘은 ${b.member.name} 생일! 🎂` : `${b.member.name} 생일 D-${b.dday}`}</div>
                    <div className="small muted bold">{b.month}월 {b.day}일</div>
                  </div>
                  <span style={{ fontSize: 26 }}>🎁</span>
                </Link>
              ))}
            </div>
          )}

          {d.memories && (
            <>
              <SectionTitle icon="📸" right={<Link to={`/trips/${d.memories.trip.id}?tab=archive`}>전체보기 ›</Link>}>
                최근 추억 · {d.memories.trip.title}
              </SectionTitle>
              <MediaGrid items={d.memories.media} onOpen={setViewer} />
            </>
          )}

          <SectionTitle icon="🏆" right={<Link to="/trips">지난 여행 {d.shelf.length} ›</Link>}>
            진열장
          </SectionTitle>
          {d.shelf.length === 0 ? (
            <div className="card small muted bold center">여행을 다녀오면 여기에 진열돼요</div>
          ) : (
            <div className="shelf-wrap">
              <div className="shelf-row">
                {d.shelf.map((t) => (
                  <MiniBox key={t.id} trip={t} />
                ))}
              </div>
              <div className="shelf" />
            </div>
          )}

          <SectionTitle icon="📣" right={<Link to="/feed">더보기 ›</Link>}>
            최근 소식
          </SectionTitle>
          {d.posts.length === 0 ? (
            <Empty>아직 소식이 없어요</Empty>
          ) : (
            <div className="card" style={{ padding: '4px 16px' }}>
              {d.posts.map((p) => (
                <Link key={p.id} to={`/feed?post=${p.id}`} className="list-row">
                  <Avatar m={p.author} size={36} />
                  <div className="grow">
                    <div className="ellipsis" style={{ fontSize: 14, fontWeight: 700 }}>
                      {p.body || `사진 ${p.media.length}장`}
                    </div>
                    <div className="small muted">
                      {p.author.name} · {ago(p.createdAt)}
                      {p.social.commentCount > 0 && ` · 댓글 ${p.social.commentCount}`}
                    </div>
                  </div>
                  <ReactionStack social={p.social} max={3} size={22} />
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {viewer != null && (
        <MediaViewer
          id={viewer}
          onClose={() => {
            setViewer(null)
            qc.invalidateQueries({ queryKey: ['home'] })
          }}
        />
      )}
    </div>
  )
}
