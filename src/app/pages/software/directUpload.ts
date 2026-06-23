import type { SoftwareUploadPart, SoftwareUploadInit } from '@/api'

/**
 * Browser direct-to-OSS upload.
 *
 * The file body is PUT straight to OSS via presigned URLs, bypassing the
 * backend entirely. This keeps multi-GB software packages out of nginx and
 * FastAPI (no body-size/timeout limits, no memory pressure) and gives a real
 * progress bar. The backend only signs the upload and records metadata later.
 */

const CONCURRENCY = 3
const MAX_RETRIES = 3

export class UploadCancelledError extends Error {
  constructor() {
    super('上传已取消')
    this.name = 'UploadCancelledError'
  }
}

function putBlob(url: string, blob: Blob, onLoaded: (loaded: number) => void, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.upload.onprogress = (e) => onLoaded(e.loaded)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = (xhr.getResponseHeader('ETag') || '').replace(/"/g, '')
        if (!etag) return reject(new Error('OSS 未返回 ETag（请检查 OSS CORS 是否暴露 ETag 头）'))
        resolve(etag)
      } else {
        reject(new Error(`OSS 上传失败 (HTTP ${xhr.status})`))
      }
    }
    xhr.onerror = () => reject(new Error('网络错误，上传失败'))
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'))
    if (signal) signal.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(blob)
  })
}

async function putWithRetry(url: string, blob: Blob, onLoaded: (loaded: number) => void, signal?: AbortSignal): Promise<string> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new UploadCancelledError()
    try {
      return await putBlob(url, blob, onLoaded, signal)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw new UploadCancelledError()
      lastErr = err
      // brief backoff before retrying this part
      await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('上传失败')
}

/**
 * Upload a file directly to OSS. Returns the part list (for multipart) or
 * null (for single PUT) to send to /upload/complete.
 *
 * onProgress receives (loaded, total) in bytes — callers compute % and rate
 * themselves; that keeps the uploader stateless about presentation.
 */
export async function uploadToOss(
  file: File,
  init: SoftwareUploadInit,
  onProgress: (loaded: number, total: number) => void,
  signal?: AbortSignal,
): Promise<SoftwareUploadPart[] | null> {
  const total = file.size
  const loaded: number[] = []
  const report = () => {
    const sum = loaded.reduce((a, b) => a + b, 0)
    onProgress(Math.min(sum, total), total)
  }

  if (init.mode === 'single') {
    loaded[0] = 0
    const etag = await putWithRetry(init.upload_url!, file, (l) => { loaded[0] = l; report() }, signal)
    loaded[0] = total
    report()
    void etag
    return null
  }

  if (init.mode !== 'multipart' || !init.part_urls || !init.part_size) {
    throw new Error('无效的上传凭证')
  }

  const partSize = init.part_size
  const urls = init.part_urls
  const results: (SoftwareUploadPart | null)[] = new Array(urls.length).fill(null)
  let nextIndex = 0

  async function worker() {
    while (true) {
      if (signal?.aborted) throw new UploadCancelledError()
      const i = nextIndex++
      if (i >= urls.length) return
      const start = i * partSize
      const end = Math.min(start + partSize, total)
      const blob = file.slice(start, end)
      loaded[i] = 0
      const etag = await putWithRetry(urls[i], blob, (l) => { loaded[i] = l; report() }, signal)
      loaded[i] = end - start
      report()
      results[i] = { part_number: i + 1, etag }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, urls.length) }, () => worker())
  await Promise.all(workers)

  const parts = results.filter((p): p is SoftwareUploadPart => p !== null)
  if (parts.length !== urls.length) throw new Error('部分分片上传失败')
  return parts
}
