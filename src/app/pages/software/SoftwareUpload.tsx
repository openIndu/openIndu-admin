import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { softwareApi, tagsApi } from '@/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Paperclip } from 'lucide-react'

export function SoftwareUpload() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [version, setVersion] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const brandsQuery = useQuery({ queryKey: ['tags', 'sw_brand'], queryFn: () => tagsApi.list('sw_brand') })
  const categoriesQuery = useQuery({ queryKey: ['tags', 'sw_category'], queryFn: () => tagsApi.list('sw_category') })
  const brandOptions = (brandsQuery.data ?? []).filter((t) => t.is_active).map((t) => ({ value: t.value, label: t.label_zh }))
  const categoryOptions = (categoriesQuery.data ?? []).filter((t) => t.is_active).map((t) => ({ value: t.value, label: t.label_zh }))

  const mutation = useMutation({
    mutationFn: softwareApi.upload,
    onSuccess: () => navigate('/software'),
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const errs: Record<string, string> = {}
    if (!brand) errs.brand = '请选择品牌'
    if (!category) errs.category = '请选择分类'
    if (!version.trim()) errs.version = '请填写版本号'
    if (!file) errs.file = '请选择软件包文件'
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }
    setFieldErrors({})
    const formData = new FormData()
    formData.append('file', file!)
    formData.append('brand', brand)
    formData.append('category', category)
    formData.append('version', version)
    formData.append('description', description)
    mutation.mutate(formData)
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>上传软件</CardTitle>
        <CardDescription>上传 zip/exe/msi/rar/7z 软件包并填写品牌、分类和版本。</CardDescription>
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
                {file ? file.name : '点击选择软件包 (.zip / .exe / .msi / .rar / .7z)'}
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

          {mutation.isError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {(() => {
                const err = mutation.error as { response?: { data?: { detail?: string | unknown[]; message?: string } } }
                const detail = err?.response?.data?.detail
                if (typeof detail === 'string') return detail
                return err?.response?.data?.message || '上传失败，请检查文件和网络连接'
              })()}
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <Button type="submit" disabled={!brand || !category || !version.trim() || !file || mutation.isPending}>
              {mutation.isPending ? '上传中...' : '上传'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/software')}>取消</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
