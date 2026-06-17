import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { configApi } from '@/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'

const defaults = {
  embedding_model: 'BAAI/bge-m3',
  embedding_device: 'cpu',
  rag_chunk_size: '512',
  rag_chunk_overlap: '50',
  rag_sync_interval: '60',
}

export function SettingsView() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['config'], queryFn: configApi.list })
  const [form, setForm] = useState(defaults)
  const mutation = useMutation({ mutationFn: configApi.update, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config'] }) })

  useEffect(() => {
    if (!query.data) return
    const next = { ...defaults }
    query.data.forEach((item) => {
      if (item.config_key in next) {
        next[item.config_key as keyof typeof next] = item.config_value
      }
    })
    setForm(next)
  }, [query.data])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate(Object.entries(form).map(([config_key, config_value]) => ({ config_key, config_value })))
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>系统配置</CardTitle>
        <CardDescription>仅维护业务参数，基础设施和敏感凭证由运维配置管理。</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading ? <div className="text-muted-foreground">正在加载配置...</div> : null}
        {query.isError ? <div className="text-destructive">配置加载失败，将使用默认值编辑。</div> : null}
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <label className="space-y-2">Embedding 模型<Input value={form.embedding_model} onChange={(event) => setForm({ ...form, embedding_model: event.target.value })} /></label>
          <label className="space-y-2">运行设备<Select options={[{ value: 'cpu', label: 'CPU' }, { value: 'cuda', label: 'CUDA' }]} value={form.embedding_device} onChange={(event) => setForm({ ...form, embedding_device: event.target.value })} /></label>
          <label className="space-y-2">Chunk Size<Input type="number" min={1} value={form.rag_chunk_size} onChange={(event) => setForm({ ...form, rag_chunk_size: event.target.value })} /></label>
          <label className="space-y-2">Chunk Overlap<Input type="number" min={0} value={form.rag_chunk_overlap} onChange={(event) => setForm({ ...form, rag_chunk_overlap: event.target.value })} /></label>
          <label className="space-y-2">同步间隔（分钟）<Input type="number" min={1} value={form.rag_sync_interval} onChange={(event) => setForm({ ...form, rag_sync_interval: event.target.value })} /></label>
          {mutation.isError ? <div className="text-sm text-destructive">保存失败</div> : null}
          {mutation.isSuccess ? <div className="text-sm text-emerald-700">保存成功</div> : null}
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? '保存中...' : '保存配置'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}
