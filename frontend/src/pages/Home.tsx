import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { useAuth } from '../auth'
import { EditionBox, MiniBox } from '../components/Edition'
import { MediaGrid, MediaViewer } from '../components/Media'
import { ReactionStack } from '../components/Reactions'
import { Avatar, Empty, Spinner } from '../components/ui'
import { orderIndex } from '../members'
import type { Home as HomeData } from '../types'
import { ago, ymLabel } from '../util'

export default function Home() {
  const { me } = useAuth()
  const nav = useNavigate()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['home'], queryFn: () => api.get<HomeData>('/api/home') })
  const [viewer, setViewer] = useState<number | null>(null)
  const d = q.data

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <div className="eyebrow">WAKBOYS</div>
          <div className="title">COLLECTION</div>
        </div>
        {me && <Avatar m={me.member} size={40} onClick={() => nav('/me')} />}
      </div>

      {!d ? (
        <Spinner />
      ) : (
        <>
          {d.nextTrip ? (
            <Link to={`/trips/${d.nextTrip.trip.id}`} style={{ display: 'block' }}>
              <EditionBox trip={d.nextTrip.trip} />
              {(d.nextTrip.openPolls > 0 || d.nextTrip.checklist.total > 0) && (
                <div className="row mt8" style={{ gap: 6 }}>
                  {d.nextTrip.openPolls > 0 && <span className="chip on">🗳️ 투표 {d.nextTrip.openPolls}개 진행 중</span>}
                  {d.nextTrip.checklist.total > 0 && (
                    <span className="chip" style={{ background: '#fff' }}>
                      준비물 {d.nextTrip.checklist.done}/{d.nextTrip.checklist.total}
                    </span>
                  )}
                </div>
              )}
            </Link>
          ) : (
            <Link to="/trips?new=1" className="card" style={{ display: 'block', border: '2px dashed #d9cdb8', background: 'transparent' }}>
              <div className="bold">다음 에디션이 아직 없어요</div>
              <div className="small muted bold mt8">여름·겨울 여행을 만들고 투표부터 시작해보세요 →</div>
            </Link>
          )}

          <Link to="/dues" className="card mt12" style={{ display: 'block' }}>
            <div className="card-h">
              <span>{ymLabel(d.dues.ym)} 회비 수집</span>
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
                  <Avatar m={b.member} size={40} />
                  <div className="grow">
                    <div className="bold">{b.dday === 0 ? `오늘은 ${b.member.name} 생일! 🎂` : `${b.member.name} 생일 D-${b.dday}`}</div>
                    <div className="small muted bold">{b.month}월 {b.day}일</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {d.memories && (
            <>
              <div className="section-h">
                <span>최근 추억 · {d.memories.trip.title}</span>
                <Link to={`/trips/${d.memories.trip.id}?tab=archive`}>전체보기 ›</Link>
              </div>
              <MediaGrid items={d.memories.media} onOpen={setViewer} />
            </>
          )}

          <div className="section-h">
            <span>진열장</span>
            <Link to="/trips">지난 에디션 {d.shelf.length} ›</Link>
          </div>
          {d.shelf.length === 0 ? (
            <div className="card small muted bold center">여행을 다녀오면 에디션이 진열돼요</div>
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

          <div className="section-h">
            <span>최근 소식</span>
            <Link to="/feed">더보기 ›</Link>
          </div>
          {d.posts.length === 0 ? (
            <Empty>아직 소식이 없어요</Empty>
          ) : (
            <div className="card" style={{ padding: '4px 16px' }}>
              {d.posts.map((p) => (
                <Link key={p.id} to={`/feed?post=${p.id}`} className="list-row">
                  <Avatar m={p.author} size={34} />
                  <div className="grow">
                    <div className="ellipsis" style={{ fontSize: 14, fontWeight: 600 }}>
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
