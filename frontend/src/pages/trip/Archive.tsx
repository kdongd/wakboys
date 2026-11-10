import { useRef, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { MediaGrid, MediaViewer, UploaderInline } from '../../components/Media'
import { useErrorToast, useToast } from '../../components/Toast'
import { Empty, Spinner } from '../../components/ui'
import type { MediaItem } from '../../types'
import { uploadFiles } from '../../upload'

type Page = { items: MediaItem[]; nextCursor?: number }

export default function Archive({ tripId }: { tripId: number }) {
  const qc = useQueryClient()
  const toast = useToast()
  const err = useErrorToast()
  const [params, setParams] = useSearchParams()
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const key = ['archive', tripId]
  const q = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => api.get<Page>(`/api/trips/${tripId}/media?size=60${pageParam ? `&before=${pageParam}` : ''}`),
    initialPageParam: 0,
    getNextPageParam: (p) => p.nextCursor,
  })
  const items = q.data?.pages.flatMap((p) => p.items) ?? []
  const open = params.get('media') ? Number(params.get('media')) : null
  const setOpen = (id: number | null) => {
    const next = new URLSearchParams(params)
    if (id == null) next.delete('media')
    else next.set('media', String(id))
    setParams(next, { replace: true })
  }

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const list = Array.from(files).slice(0, 50)
    try {
      setProgress(0)
      const media = await uploadFiles(list, setProgress)
      await api.post(`/api/trips/${tripId}/media`, { items: media })
      toast(`${list.length}개를 올렸어요 📸`)
      qc.invalidateQueries({ queryKey: key })
      qc.invalidateQueries({ queryKey: ['trip', tripId] })
      qc.invalidateQueries({ queryKey: ['home'] })
    } catch (e) {
      err(e)
    } finally {
      setProgress(null)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div>
      <UploaderInline progress={progress} />
      <button className="btn" disabled={progress != null} onClick={() => input.current?.click()}>📸 사진·영상 올리기</button>
      <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      <div className="small muted bold center mt8">한 번에 50개 · 사진 25MB · 영상 500MB까지</div>
      <div className="mt16">
        {q.isLoading ? <Spinner /> : items.length === 0 ? <Empty>이 에디션의 첫 사진을 올려주세요</Empty> : <MediaGrid items={items} onOpen={setOpen} />}
      </div>
      {q.hasNextPage && (
        <button className="btn light mt12" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>더 보기</button>
      )}
      {open != null && (
        <MediaViewer
          id={open}
          onClose={() => setOpen(null)}
          onDeleted={() => {
            qc.invalidateQueries({ queryKey: key })
            qc.invalidateQueries({ queryKey: ['trip', tripId] })
          }}
          onSocial={(id, s) =>
            qc.setQueryData<{ pages: Page[]; pageParams: unknown[] }>(key, (d) =>
              d ? { ...d, pages: d.pages.map((p) => ({ ...p, items: p.items.map((m) => (m.id === id ? { ...m, social: s } : m)) })) } : d,
            )
          }
        />
      )}
    </div>
  )
}
