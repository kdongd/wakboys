import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { useAuth } from '../auth'
import { img, type ReactionKey } from '../members'
import type { MediaItem, Social } from '../types'
import { useMembers } from '../useMembers'
import { ago } from '../util'
import { Comments } from './Comments'
import { ReactionBar, ReactionStack } from './Reactions'
import { useErrorToast, useToast } from './Toast'
import { Avatar, confirmAsk, Name, Spinner } from './ui'

function topReaction(s: Social) {
  if (!s.reactions.length) return null
  return s.reactions[s.reactions.length - 1]
}

export function MediaGrid({ items, onOpen }: { items: MediaItem[]; onOpen: (id: number) => void }) {
  const { byId } = useMembers()
  return (
    <div className="media-grid">
      {items.map((m) => {
        const r = topReaction(m.social)
        const rm = r ? byId.get(r.memberId) : undefined
        return (
          <button key={m.id} className="media-cell" onClick={() => onOpen(m.id)}>
            {m.thumbUrl ? <img src={m.thumbUrl} alt="" loading="lazy" /> : <div style={{ width: '100%', height: '100%', background: '#2a2a30' }} />}
            {m.kind === 'VIDEO' && <span className="play">▶ {m.durationSec ? fmtDur(m.durationSec) : ''}</span>}
            {r && rm && (
              <span className="rx">
                <img src={img.reaction(rm.slug, r.reaction as ReactionKey)} alt="" />
                {m.social.reactions.length}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function fmtDur(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

type Viewer = { media: MediaItem; prevId?: number; nextId?: number }

/** Full-screen photo/video with swipe, reactions and comments. */
export function MediaViewer({ id, onClose, onDeleted, onSocial, list }: {
  id: number
  onClose: () => void
  onDeleted?: (id: number) => void
  onSocial?: (id: number, s: Social) => void
  /** when given (e.g. a post's photos), prev/next walk this list instead of the trip */
  list?: number[]
}) {
  const [current, setCurrent] = useState(id)
  const { me } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const err = useErrorToast()
  const touch = useRef<number | null>(null)
  const q = useQuery({ queryKey: ['media', current], queryFn: () => api.get<Viewer>(`/api/media/${current}`) })

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const idx = list ? list.indexOf(current) : -1
  const prevId = list ? (idx > 0 ? list[idx - 1] : undefined) : q.data?.prevId
  const nextId = list ? (idx >= 0 && idx < list.length - 1 ? list[idx + 1] : undefined) : q.data?.nextId

  const del = useMutation({
    mutationFn: () => api.del(`/api/media/${current}`),
    onSuccess: () => {
      toast('삭제했어요')
      onDeleted?.(current)
      onClose()
    },
    onError: err,
  })

  const setSocial = (s: Social) => {
    qc.setQueryData<Viewer>(['media', current], (v) => (v ? { ...v, media: { ...v.media, social: s } } : v))
    onSocial?.(current, s)
  }

  const m = q.data?.media
  return (
    <div className="viewer">
      <div className="viewer-top">
        <button onClick={onClose} style={{ fontSize: 26, lineHeight: 1, width: 36 }}>×</button>
        {m && (
          <div className="row grow" style={{ gap: 8 }}>
            <Avatar m={m.uploader} size={28} />
            <div className="grow" style={{ fontSize: 13 }}>
              <div className="bold">{m.uploader.name}</div>
              <div style={{ opacity: 0.6, fontSize: 11 }}>{ago(m.createdAt)}</div>
            </div>
          </div>
        )}
        {m && (
          <a href={m.url} target="_blank" rel="noreferrer" className="chip dark">원본</a>
        )}
        {m && (me?.member.id === m.uploader.id || me?.member.admin) && (
          <button className="chip dark" onClick={() => confirmAsk('이 파일을 삭제할까요?') && del.mutate()}>삭제</button>
        )}
      </div>
      <div
        className="viewer-stage"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current == null) return
          const dx = e.changedTouches[0].clientX - touch.current
          touch.current = null
          if (dx < -50 && nextId) setCurrent(nextId)
          if (dx > 50 && prevId) setCurrent(prevId)
        }}
      >
        {!m ? (
          <Spinner />
        ) : m.kind === 'VIDEO' ? (
          <video key={m.id} src={m.url} poster={m.thumbUrl} controls playsInline preload="metadata" />
        ) : (
          <img key={m.id} src={m.url} alt="" />
        )}
        {prevId && <button className="viewer-nav" style={{ left: 0 }} onClick={() => setCurrent(prevId)} aria-label="이전" />}
        {nextId && <button className="viewer-nav" style={{ right: 0 }} onClick={() => setCurrent(nextId)} aria-label="다음" />}
      </div>
      {m && (
        <div className="viewer-bottom">
          <ReactionBar type="MEDIA" id={m.id} social={m.social} onChange={setSocial} />
          {m.social.reactions.length > 0 && (
            <div className="row mt12" style={{ gap: 8 }}>
              <ReactionStack social={m.social} max={8} />
              <ReactorNames social={m.social} />
            </div>
          )}
          <div className="mt8">
            <Comments type="MEDIA" id={m.id} />
          </div>
        </div>
      )}
    </div>
  )
}

function ReactorNames({ social }: { social: Social }) {
  const { byId } = useMembers()
  const names = social.reactions.map((r) => byId.get(r.memberId)?.name).filter(Boolean)
  if (!names.length) return null
  return (
    <span className="small muted ellipsis">
      {names.slice(0, 2).join(', ')}
      {names.length > 2 ? ` 외 ${names.length - 2}명` : ''}
    </span>
  )
}

export function UploaderInline({ progress }: { progress: number | null }) {
  if (progress == null) return null
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div className="between small bold">
        <span>올리는 중…</span>
        <span>{Math.round(progress * 100)}%</span>
      </div>
      <div className="upload-bar mt8">
        <div style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  )
}

export { Name }
