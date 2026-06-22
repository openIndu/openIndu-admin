import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { documentApi, tagsApi } from '@/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'

export function DocumentUpload() {
  const navigate = useNavigate()
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [series, setSeries] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const queryClient = useQueryClient()

  const brandsQuery = useQuery({ queryKey: ['tags', 'doc_brand'], queryFn: () => tagsApi.list('doc_brand') })
  const categoriesQuery = useQuery({ queryKey: ['tags', 'doc_category'], queryFn: () => tagsApi.list('doc_category') })
  const seriesQuery = useQuery({ queryKey: ['tags', 'doc_series', category, brand], queryFn: () => tagsApi.list('doc_series', category, brand || undefined), enabled: !!category })
  const brandOptions = (brandsQuery.data ?? []).filter((t) => t.is_active).map((t) => ({ value: t.value, label: t.label_zh }))
  const categoryOptions = (categoriesQuery.data ?? []).filter((t) => t.is_active).map((t) => ({ value: t.value, label: t.label_zh }))
  const seriesOptions = (seriesQuery.data ?? []).filter((t) => t.is_active).map((t) => ({ value: t.value, label: t.label_zh }))

  const mutation = useMutation({
    mutationFn: documentApi.upload,
    onSuccess: (newDoc) => {
      queryClient.setQueriesData({ queryKey: ['documents'] }, (old: unknown) => {
        const data = old as { items?: unknown[]; total?: number } | undefined
        if (!data?.items) return old
        return { ...data, items: [newDoc, ...data.items], total: (data.total ?? 0) + 1 }
      })
      navigate('/documents')
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file || !brand || !category) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('brand', brand)
    formData.append('category', category)
    if (series) formData.append('series', series)
    formData.append('description', description)
    mutation.mutate(formData)
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>上传文档</CardTitle>
        <CardDescription>上传 PDF 文档并选择品牌和分类。</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="space-y-2">品牌<Select placeholder="请选择品牌" options={brandOptions} value={brand} onChange={(event) => { setBrand(event.target.value); setSeries('') }} required /></label>
          <label className="space-y-2">分类<Select placeholder="请选择分类" options={categoryOptions} value={category} onChange={(event) => { setCategory(event.target.value); setSeries('') }} required /></label>
          {category && seriesOptions.length > 0 ? (
            <label className="space-y-2">系列（可选）<Select placeholder="不选系列" options={seriesOptions} value={series} onChange={(event) => setSeries(event.target.value)} /></label>
          ) : null}
          <label className="space-y-2">说明<Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="可选说明" /></label>
          <label className="space-y-2">PDF 文件<Input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></label>
          {mutation.isError ? (
            <div className="text-sm text-destructive">
              {(() => {
                const err = mutation.error as { response?: { data?: { detail?: string; message?: string } } }
                return err?.response?.data?.detail || err?.response?.data?.message || '上传失败，请检查文件和网络'
              })()}
            </div>
          ) : null}
          <div className="mt-6 flex gap-3"><Button type="submit" disabled={!file || !brand || !category || mutation.isPending}>{mutation.isPending ? '上传中...' : '上传'}</Button><Button type="button" variant="outline" onClick={() => navigate('/documents')}>取消</Button></div>
        </form>
      </CardContent>
    </Card>
  )
}
