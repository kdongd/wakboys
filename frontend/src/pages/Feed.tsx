import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { Comments } from '../components/Comments'
import { MediaViewer, UploaderInline } from '../components/Media'
import { ReactionBar, ReactionStack } from '../components/Reactions'
import { useErrorToast } from '../components/Toast'
import { Avatar, confirmAsk, Empty, Name, Sheet, Spinner } from '../components/ui'
import type { Post, Social } from '../types'
import { uploadFiles } from '../upload'
import { ago } from '../util'
import { PageHead } from '../components/World'

type Page = { items: Post[]; nextCursor?: number }

export default function Feed() {
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const focus = params.get('post') ? Number(params.get('post')) : null
  const [composing, setComposing] = useState(false)
  const { me } = useAuth()
  const q = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) => api.get<Page>(`/api/posts?size=20${pageParam ? `&before=${pageParam}` : ''}`),
    initialPageParam: 0,
    getNextPageParam: (p) => p.nextCursor,
  })
  const posts = q.data?.pages.flatMap((p) => p.items) ?? []

  const patch = (id: number, fn: (p: Post) => Post) =>
    qc.setQueryData<{ pages: Page[]; pageParams: unknown[] }>(['posts'], (d) =>
      d ? { ...d, pages: d.pages.map((pg) => ({ ...pg, items: pg.items.map((p) => (p.id === id ? fn(p) : p)) })) } : d,
    )

  return (
    <div className="page">
      <PageHead icon="💬" title="소식" />

      <button className="card row" style={{ width: '100%', textAlign: 'left' }} onClick={() => setComposing(true)}>
        {me && <Avatar m={me.member} size={38} />}
        <span className="grow muted bold">무슨 일 있었어?</span>
        <span className="chip">📷</span>
      </button>

      <div className="mt12">
        {q.isLoading ? (
          <Spinner />
        ) : posts.length === 0 ? (
          <Empty>첫 소식을 남겨보세요</Empty>
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} focus={focus === p.id} onPatch={(fn) => patch(p.id, fn)} />)
        )}
      </div>
      {q.hasNextPage && (
        <button className="btn light mt12" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>더 보기</button>
      )}

      {composing && (
        <Composer
          onClose={() => setComposing(false)}
          onDone={() => {
            setComposing(false)
            qc.invalidateQueries({ queryKey: ['posts'] })
            qc.invalidateQueries({ queryKey: ['home'] })
          }}
        />
      )}
    </div>
  )
}

function PostCard({ post, focus, onPatch }: { post: Post; focus: boolean; onPatch: (fn: (p: Post) => Post) => void }) {
  const { me } = useAuth()
  const qc = useQueryClient()
  const err = useErrorToast()
  const ref = useRef<HTMLDivElement>(null)
  const [showComments, setShowComments] = useState(focus)
  const [showReact, setShowReact] = useState(false)
  const [viewer, setViewer] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(post.body)

  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focus])

  const del = useMutation({
    mutationFn: () => api.del(`/api/posts/${post.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
    onError: err,
  })
  const save = useMutation({
    mutationFn: () => api.patch<Post>(`/api/posts/${post.id}`, { body }),
    onSuccess: (p) => { onPatch(() => p); setEditing(false) },
    onError: err,
  })
  const mine = me?.member.id === post.author.id
  const n = post.media.length
  const setSocial = (s: Social) => onPatch((p) => ({ ...p, social: s }))

  return (
    <div className="card" ref={ref} style={focus ? { boxShadow: `inset 0 0 0 2px ${post.author.themeColor}` } : undefined}>
      <div className="row">
        <Avatar m={post.author} size={38} />
        <div className="grow">
          <Name m={post.author} />
          <div className="small muted">{ago(post.createdAt)}{post.edited && ' · 수정됨'}</div>
        </div>
        {mine && <button className="small muted bold" onClick={() => setEditing(true)}>수정</button>}
        {(mine || me?.member.admin) && (
          <button className="small muted bold" onClick={() => confirmAsk('이 글을 지울까요?') && del.mutate()}>삭제</button>
        )}
      </div>
      {editing ? (
        <div className="mt12">
          <textarea className="textarea" value={body} maxLength={3000} onChange={(e) => setBody(e.target.value)} />
          <div className="row mt8">
            <button className="btn light sm" onClick={() => { setEditing(false); setBody(post.body) }}>취소</button>
            <button className="btn sm" disabled={save.isPending} onClick={() => save.mutate()}>저장</button>
          </div>
        </div>
      ) : (
        post.body && <div style={{ fontSize: 15, lineHeight: 1.55, marginTop: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.body}</div>
      )}
      {n > 0 && (
        <div className={`feed-media n${Math.min(n, 4)}`}>
          {post.media.slice(0, 4).map((m, i) => (
            <button key={m.id} onClick={() => setViewer(m.id)}>
              {m.thumbUrl ? <img src={m.thumbUrl} alt="" loading="lazy" /> : null}
              {m.kind === 'VIDEO' && <span className="play" style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 6, padding: '2px 5px' }}>▶</span>}
              {i === 3 && n > 4 && <span className="more">+{n - 4}</span>}
            </button>
          ))}
        </div>
      )}
      <div className="between mt12">
        <ReactionStack social={post.social} />
        <div className="row" style={{ gap: 6, marginLeft: 'auto' }}>
          <button className={'chip' + (post.social.mine ? ' on' : '')} onClick={() => setShowReact(!showReact)}>
            {post.social.mine ? '리액션 ✓' : '리액션'}
          </button>
          <button className="chip" onClick={() => setShowComments(!showComments)}>댓글 {post.social.commentCount || ''}</button>
        </div>
      </div>
      {showReact && (
        <div className="mt12">
          <ReactionBar type="POST" id={post.id} social={post.social} onChange={(s) => { setSocial(s); setShowReact(false) }} />
        </div>
      )}
      {showComments && (
        <div className="mt8" style={{ borderTop: '1px solid #f1ece3', paddingTop: 6 }}>
          <Comments type="POST" id={post.id} onCount={(c) => onPatch((p) => ({ ...p, social: { ...p.social, commentCount: c } }))} />
        </div>
      )}
      {viewer != null && <MediaViewer id={viewer} list={post.media.map((m) => m.id)} onClose={() => setViewer(null)} />}
    </div>
  )
}

function Composer({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const err = useErrorToast()
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const previews = files.map((f) => ({ f, url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null }))

  const submit = async () => {
    try {
      let media = undefined
      if (files.length) {
        setProgress(0)
        media = await uploadFiles(files, setProgress)
      }
      await api.post('/api/posts', { body, media })
      onDone()
    } catch (e) {
      err(e)
      setProgress(null)
    }
  }

  return (
    <Sheet open onClose={progress == null ? onClose : () => {}} title="새 소식">
      <textarea className="textarea mt12" autoFocus placeholder="친구들에게 알리고 싶은 소식" value={body} maxLength={3000} onChange={(e) => setBody(e.target.value)} />
      {previews.length > 0 && (
        <div className="row mt8 scroll-x" style={{ gap: 6 }}>
          {previews.map(({ f, url }, i) => (
            <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: 10, overflow: 'hidden', background: '#2a2a30', flex: 'none' }}>
              {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#fff', fontSize: 11, padding: 6, display: 'block' }}>🎬 {f.name}</span>}
              <button onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,.6)', color: '#fff', borderRadius: 99, width: 20, height: 20, fontSize: 12 }}>×</button>
            </div>
          ))}
        </div>
      )}
      <div className="mt12"><UploaderInline progress={progress} /></div>
      <div className="row mt8">
        <button className="btn light sm" onClick={() => input.current?.click()} disabled={progress != null}>📷 사진·영상</button>
        <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 20)); e.target.value = '' }} />
        <button className="btn sm" style={{ marginLeft: 'auto' }} disabled={progress != null || (!body.trim() && files.length === 0)} onClick={submit}>올리기</button>
      </div>
    </Sheet>
  )
}
