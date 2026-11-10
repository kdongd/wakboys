import { api } from './api'

export type NewMedia = {
  key: string
  thumbKey?: string
  contentType: string
  width?: number
  height?: number
  size: number
  durationSec?: number
}

type Slot = { key: string; uploadUrl: string; thumbKey: string; thumbUploadUrl: string }

type Prepared = { file: File; contentType: string; width?: number; height?: number; durationSec?: number; thumb: Blob | null }

const THUMB = 720

function guessType(f: File) {
  if (f.type) return f.type
  const ext = f.name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
    heic: 'image/heic', heif: 'image/heif', mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  }
  return map[ext ?? ''] ?? 'application/octet-stream'
}

function canvasThumb(source: CanvasImageSource, w: number, h: number): Promise<Blob | null> {
  const scale = Math.min(1, THUMB / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * scale))
  c.height = Math.max(1, Math.round(h * scale))
  c.getContext('2d')!.drawImage(source, 0, 0, c.width, c.height)
  return new Promise((res) => c.toBlob((b) => res(b), 'image/webp', 0.8))
}

async function prepareImage(file: File, contentType: string): Promise<Prepared> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    const thumb = await canvasThumb(bmp, bmp.width, bmp.height)
    const out = { file, contentType, width: bmp.width, height: bmp.height, thumb }
    bmp.close()
    return out
  } catch {
    // e.g. HEIC on browsers that can't decode it: upload the original without a thumbnail
    return { file, contentType, thumb: null }
  }
}

function prepareVideo(file: File, contentType: string): Promise<Prepared> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.preload = 'metadata'
    v.src = url
    const done = (p: Prepared) => {
      URL.revokeObjectURL(url)
      resolve(p)
    }
    const fallback = window.setTimeout(() => done({ file, contentType, thumb: null }), 8000)
    v.onloadedmetadata = () => {
      v.currentTime = Math.min(1, (v.duration || 2) / 2)
    }
    v.onseeked = async () => {
      window.clearTimeout(fallback)
      const thumb = await canvasThumb(v, v.videoWidth, v.videoHeight).catch(() => null)
      done({
        file,
        contentType,
        width: v.videoWidth,
        height: v.videoHeight,
        durationSec: Number.isFinite(v.duration) ? Math.round(v.duration) : undefined,
        thumb,
      })
    }
    v.onerror = () => {
      window.clearTimeout(fallback)
      done({ file, contentType, thumb: null })
    }
  })
}

function put(url: string, body: Blob, contentType: string, onProgress?: (loaded: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (e) => onProgress?.(e.loaded)
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error('업로드에 실패했어요 (' + xhr.status + ')')))
    xhr.onerror = () => reject(new Error('업로드 중 연결이 끊겼어요'))
    xhr.send(body)
  })
}

/**
 * Uploads straight to R2 with presigned URLs, then returns the metadata to register.
 * onProgress gets 0..1 over all bytes.
 */
export async function uploadFiles(files: File[], onProgress?: (p: number) => void): Promise<NewMedia[]> {
  const prepared: Prepared[] = []
  for (const f of files) {
    const ct = guessType(f)
    prepared.push(ct.startsWith('video/') ? await prepareVideo(f, ct) : await prepareImage(f, ct))
  }
  const slots = await api.post<Slot[]>('/api/uploads/presign', {
    files: prepared.map((p) => ({ contentType: p.contentType, size: p.file.size })),
  })
  const total = prepared.reduce((s, p) => s + p.file.size + (p.thumb?.size ?? 0), 0) || 1
  const loaded = new Array(prepared.length).fill(0)
  const report = () => onProgress?.(loaded.reduce((a, b) => a + b, 0) / total)

  const out: NewMedia[] = new Array(prepared.length)
  let next = 0
  const worker = async () => {
    while (next < prepared.length) {
      const i = next++
      const p = prepared[i]
      const s = slots[i]
      let thumbOk = false
      if (p.thumb) {
        try {
          await put(s.thumbUploadUrl, p.thumb, 'image/webp')
          thumbOk = true
        } catch {
          /* thumbnail is optional */
        }
      }
      const thumbSize = p.thumb?.size ?? 0
      await put(s.uploadUrl, p.file, p.contentType, (l) => {
        loaded[i] = thumbSize + l
        report()
      })
      loaded[i] = thumbSize + p.file.size
      report()
      out[i] = {
        key: s.key,
        thumbKey: thumbOk ? s.thumbKey : undefined,
        contentType: p.contentType,
        width: p.width,
        height: p.height,
        size: p.file.size,
        durationSec: p.durationSec,
      }
    }
  }
  await Promise.all([worker(), worker(), worker()])
  return out
}
