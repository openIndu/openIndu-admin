import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { documentApi } from '@/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'

const brandOptions = [
  { value: 'siemens', label: '西门子' },
  { value: 'mitsubishi', label: '三菱' },
  { value: 'omron', label: '欧姆龙' },
  { value: 'keyence', label: '基恩士' },
  { value: 'inovance', label: '汇川' },
]

const categoryOptions = [
  { value: 'plc-manual', label: 'PLC 编程手册' },
  { value: 'hardware-manual', label: '硬件手册' },
  { value: 'driver-manual', label: '驱动器手册' },
  { value: 'hmi-manual', label: 'HMI 手册' },
  { value: 'software-manual', label: '软件手册' },
  { value: 'best-practice', label: '最佳实践' },
  { value: 'electrical-standard', label: '电气规范' },
  { value: 'other', label: '其他' },
]

export function DocumentUpload() {
  const navigate = useNavigate()
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const mutation = useMutation({ mutationFn: documentApi.upload, onSuccess: () => navigate('/documents') })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file || !brand || !category) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('brand', brand)
    formData.append('category', category)
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
          <label className="space-y-2">品牌<Select placeholder="请选择品牌" options={brandOptions} value={brand} onChange={(event) => setBrand(event.target.value)} required /></label>
          <label className="space-y-2">分类<Select placeholder="请选择分类" options={categoryOptions} value={category} onChange={(event) => setCategory(event.target.value)} required /></label>
          <label className="space-y-2">说明<Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="可选说明" /></label>
          <label className="space-y-2">PDF 文件<Input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></label>
          {mutation.isError ? <div className="text-sm text-destructive">上传失败，请检查文件和网络</div> : null}
          <div className="flex gap-3"><Button type="submit" disabled={!file || !brand || !category || mutation.isPending}>{mutation.isPending ? '上传中...' : '上传'}</Button><Button type="button" variant="outline" onClick={() => navigate('/documents')}>取消</Button></div>
        </form>
      </CardContent>
    </Card>
  )
}
