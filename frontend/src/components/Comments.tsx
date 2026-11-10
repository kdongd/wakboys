import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { useAuth } from '../auth'
import type { Comment } from '../types'
import { ago } from '../util'
import { Avatar, Name } from './ui'
import { useErrorToast } from './Toast'

export function Comments({ type, id, onCount }: { type: 'MEDIA' | 'POST'; id: number; onCount?: (n: number) => void }) {
  const { me } = useAuth()
  const qc = useQueryClient()
  const err = useErrorToast()
  const [text, setText] = useState('')
  const key = ['comments', type, id]
  const q = useQuery({ queryKey: key, queryFn: () => api.get<Comment[]>(`/api/comments?type=${type}&id=${id}`) })

  const add = useMutation({
    mutationFn: () => api.post<Comment>('/api/comments', { type, id, body: text }),
    onSuccess: (c) => {
      const next = [...(q.data ?? []), c]
      qc.setQueryData(key, next)
      setText('')
      onCount?.(next.length)
    },
    onError: err,
  })
  const del = useMutation({
    mutationFn: (cid: number) => api.del(`/api/comments/${cid}`),
    onSuccess: (_, cid) => {
      const next = (q.data ?? []).filter((c) => c.id !== cid)
      qc.setQueryData(key, next)
      onCount?.(next.length)
    },
    onError: err,
  })

  return (
    <div>
      {(q.data ?? []).map((c) => (
        <div key={c.id} className="row" style={{ alignItems: 'flex-start', padding: '8px 0' }}>
          <Avatar m={c.author} size={30} />
          <div className="grow">
            <div className="row" style={{ gap: 6 }}>
              <span style={{ fontSize: 13 }}><Name m={c.author} /></span>
              <span className="small muted">{ago(c.createdAt)}</span>
              {(me?.member.id === c.author.id || me?.member.admin) && (
                <button className="small muted" style={{ marginLeft: 'auto' }} onClick={() => del.mutate(c.id)}>
                  삭제
                </button>
              )}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.45, marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.body}</div>
          </div>
        </div>
      ))}
      <form
        className="row mt8"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) add.mutate()
        }}
      >
        <input className="input" placeholder="댓글 달기" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} />
        <button className="btn sm" disabled={!text.trim() || add.isPending}>
          등록
        </button>
      </form>
    </div>
  )
}
