import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { softwareApi, tagsApi, type SoftwareUploadPart } from '@/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Paperclip } from 'lucide-react'
import { uploadToOss, UploadCancelledError } from './directUpload'

type Phase = 'idle' | 'uploading' | 'finalizing' | 'error'

function humanSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function humanRate(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '-'
  return `${humanSize(bytesPerSec)}/s`
}

export function SoftwareUpload() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Rolling sample for rate calculation. We compare the latest progress event
  // against a snapshot from ~1s ago — that's smooth without being laggy and
  // ignores transient bursts when a part finishes.
  const sampleRef = useRef<{ loaded: number; t: number } | null>(null)
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [version, setVersion] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(0)
  const [total, setTotal] = useState(0)
  const [rate, setRate] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const brandsQuery = useQuery({ queryKey: ['tags', 'sw_brand'], queryFn: () => tagsApi.list('sw_brand') })
  const categoriesQuery = useQuery({ queryKey: ['tags', 'sw_category'], queryFn: () => tagsApi.list('sw_category') })
  const brandOptions = (brandsQuery.data ?? []).filter((t) => t.is_active).map((t) => ({ value: t.value, label: t.label_zh }))
  const categoryOptions = (categoriesQuery.data ?? []).filter((t) => t.is_active).map((t) => ({ value: t.value, label: t.label_zh }))

  function reset() {
    abortRef.current?.abort()
    abortRef.current = null
    sampleRef.current = null
    setPhase('idle')
    setLoaded(0)
    setTotal(0)
    setRate(0)
    setErrorMsg('')
  }

  function handleCancel() {
    reset()
    navigate('/software')
  }

  function reportProgress(l: number, t: number) {
    setLoaded(l)
    setTotal(t)
    const now = Date.now()
    const prev = sampleRef.current
    if (!prev) {
      sampleRef.current = { loaded: l, t: now }
      return
    }
    const dt = now - prev.t
    if (dt >= 800) {
      const dBytes = Math.max(0, l - prev.loaded)
      setRate((dBytes * 1000) / dt)
      sampleRef.current = { loaded: l, t: now }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errs: Record<string, string> = {}
    if (!brand) errs.brand = '请选择品牌'
    if (!category) errs.category = '请选择分类'
    if (!version.trim()) errs.version = '请填写版本号'
    if (!file) errs.file = '请选择软件包文件'
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }
    setFieldErrors({})
    setErrorMsg('')
    setLoaded(0)
    setTotal(file!.size)
    setRate(0)
    sampleRef.current = { loaded: 0, t: Date.now() }
    setPhase('uploading')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const init = await softwareApi.uploadInit({
        filename: file!.name,
        brand,
        category,
        version,
        description,
        content_type: file!.type || 'application/octet-stream',
        size: file!.size,
      })

      let parts: SoftwareUploadPart[] | null = null
      if (init.mode === 'sync') {
        const formData = new FormData()
        formData.append('file', file!)
        formData.append('brand', brand)
        formData.append('category', category)
        formData.append('version', version)
        formData.append('description', description)
        await softwareApi.upload(formData, (e) => {
          if (e.total) reportProgress(e.loaded, e.total)
        })
      } else {
        parts = await uploadToOss(file!, init, reportProgress, controller.signal)
      }

      setPhase('finalizing')
      setRate(0)
      if (init.mode !== 'sync' && init.token) {
        await softwareApi.uploadComplete({ token: init.token, parts: parts ?? undefined })
      }
      navigate('/software')
    } catch (err) {
      if (err instanceof UploadCancelledError) {
        setPhase('idle')
        setLoaded(0)
        setTotal(0)
        setRate(0)
        return
      }
      const e = err as { code?: string; response?: { data?: { detail?: string; message?: string } }; message?: string }
      setPhase('error')
      setRate(0)
      setErrorMsg(e?.response?.data?.detail || e?.response?.data?.message || e?.message || '上传失败，请检查文件和网络连接')
    } finally {
      abortRef.current = null
    }
  }

  const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0
  const buttonText = phase === 'uploading' ? '上传中...' : phase === 'finalizing' ? '处理中...' : '上传'

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>上传软件</CardTitle>
        <CardDescription>上传 zip/exe/msi/rar/7z 软件包并填写品牌、分类和版本。大文件将直传对象存储。</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-sm">品牌</label>
            <Select placeholder="请选择品牌" options={brandOptions} value={brand} onChange={(e) => setBrand(e.target.value)} />
            {fieldErrors.brand && <p className="text-xs text-destructive">{fieldErrors.brand}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm">分类</label>
            <Select placeholder="请选择分类" options={categoryOptions} value={category} onChange={(e) => setCategory(e.target.value)} />
            {fieldErrors.category && <p className="text-xs text-destructive">{fieldErrors.category}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm">版本</label>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="如 V18 / 2.1.0" />
            {fieldErrors.version && <p className="text-xs text-destructive">{fieldErrors.version}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm">说明</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="可选说明" />
          </div>

          <div className="space-y-1">
            <label className="text-sm">软件包</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
            >
              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className={file ? 'text-foreground' : 'text-muted-foreground'}>
                {file ? `${file.name} (${humanSize(file.size)})` : '点击选择软件包 (.zip / .exe / .msi / .rar / .7z)'}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.exe,.msi,.rar,.7z"
              className="sr-only"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setFieldErrors((prev) => ({ ...prev, file: '' })) }}
            />
            {fieldErrors.file && <p className="text-xs text-destructive">{fieldErrors.file}</p>}
          </div>

          {(phase === 'uploading' || phase === 'finalizing') ? (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full bg-primary transition-all duration-150 ${phase === 'finalizing' ? 'animate-pulse' : ''}`}
                  style={{ width: `${phase === 'finalizing' ? 100 : pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {phase === 'uploading' ? (
                  <>
                    <span>{humanSize(loaded)} / {humanSize(total)} ({pct}%)</span>
                    <span>{humanRate(rate)}</span>
                  </>
                ) : (
                  <span>文件已上传，正在合并并写入数据库...</span>
                )}
              </div>
            </div>
          ) : null}

          {phase === 'error' ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {errorMsg}
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <Button type="submit" disabled={!brand || !category || !version.trim() || !file || phase === 'uploading' || phase === 'finalizing'}>
              {buttonText}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>
              {phase === 'uploading' ? '取消上传' : '取消'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
