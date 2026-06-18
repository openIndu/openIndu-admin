import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { softwareApi } from '@/api'
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
  { value: 'plc-ide', label: 'PLC 编程软件' },
  { value: 'hmi-ide', label: 'HMI 编程软件' },
  { value: 'plc-driver', label: '驱动软件' },
  { value: 'utility', label: '调试工具' },
  { value: 'firmware', label: '固件升级' },
  { value: 'other', label: '其他' },
]

export function SoftwareUpload() {
  const navigate = useNavigate()
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [version, setVersion] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const mutation = useMutation({ mutationFn: softwareApi.upload, onSuccess: () => navigate('/software') })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file || !brand || !category || !version) return
    const formData = new FormData()
    formData.append('file', file)
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
          <label className="space-y-2">品牌<Select placeholder="请选择品牌" options={brandOptions} value={brand} onChange={(event) => setBrand(event.target.value)} required /></label>
          <label className="space-y-2">分类<Select placeholder="请选择分类" options={categoryOptions} value={category} onChange={(event) => setCategory(event.target.value)} required /></label>
          <label className="space-y-2">版本<Input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="如 V18 / 2.1.0" required /></label>
          <label className="space-y-2">说明<Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="可选说明" /></label>
          <label className="space-y-2">软件包<Input type="file" accept=".zip,.exe,.msi,.rar,.7z" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></label>
          {mutation.isError ? (
            <div className="text-sm text-destructive">
              {(() => {
                const err = mutation.error as { response?: { data?: { detail?: string; message?: string } } }
                return err?.response?.data?.detail || err?.response?.data?.message || '上传失败，请检查文件和网络'
              })()}
            </div>
          ) : null}
          <div className="mt-6 flex gap-3"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? '上传中...' : '上传'}</Button><Button type="button" variant="outline" onClick={() => navigate('/software')}>取消</Button></div>
        </form>
      </CardContent>
    </Card>
  )
}
