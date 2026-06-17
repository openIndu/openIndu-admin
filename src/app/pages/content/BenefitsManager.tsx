import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { portalApi } from '@/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ConfirmDialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'

interface BenefitItem {
  title: string
  description: string
  icon: string
}

export function BenefitsManager() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['portal', 'benefits'], queryFn: () => portalApi.getBenefits() as Promise<BenefitItem[]> })
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [form, setForm] = useState<BenefitItem>({ title: '', description: '', icon: '' })
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['portal', 'benefits'] })
  const saveMutation = useMutation({
    mutationFn: (payload: BenefitItem[]) => portalApi.updateBenefits(payload),
    onSuccess: invalidate,
  })

  const reset = () => {
    setEditingIndex(null)
    setForm({ title: '', description: '', icon: '' })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const current = query.data ? [...query.data] : []
    if (editingIndex !== null && editingIndex >= 0 && editingIndex < current.length) {
      current[editingIndex] = form
    } else {
      current.push(form)
    }
    saveMutation.mutate(current)
    reset()
  }

  const handleDelete = () => {
    if (deletingIndex === null || !query.data) return
    const updated = query.data.filter((_, i) => i !== deletingIndex)
    saveMutation.mutate(updated)
    setDeletingIndex(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>优势特色管理</CardTitle>
          <CardDescription>编辑官网优势特色卡片（标题、描述、图标）。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
            <Input placeholder="标题" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            <Input placeholder="描述" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
            <Input placeholder="图标" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} />
            <div className="flex gap-2 md:col-span-3">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? '保存中...' : editingIndex !== null ? '保存修改' : '新增卡片'}
              </Button>
              {editingIndex !== null ? <Button type="button" variant="outline" onClick={reset}>取消编辑</Button> : null}
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          {query.isLoading ? <div className="text-muted-foreground">正在加载...</div> : null}
          {query.isError ? <div className="text-destructive">优势特色加载失败</div> : null}
          {!query.isLoading && !query.isError && query.data?.length === 0 ? <div className="text-muted-foreground">暂无优势特色卡片</div> : null}
          {query.data && query.data.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>标题</TableHead><TableHead>描述</TableHead><TableHead>图标</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
              <TableBody>
                {query.data.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.icon ?? '-'}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => { setEditingIndex(index); setForm({ ...item }) }}>编辑</Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeletingIndex(index)}>删除</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
      <ConfirmDialog open={deletingIndex !== null} title="确认删除优势特色卡片？" description="删除后将不再在官网展示。" onCancel={() => setDeletingIndex(null)} onConfirm={handleDelete} />
    </div>
  )
}
