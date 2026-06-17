import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { portalApi, type PortalSolution } from '@/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ConfirmDialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'

export function SolutionsManager() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['portal', 'solutions'], queryFn: portalApi.getSolutions })
  const [editing, setEditing] = useState<PortalSolution | null>(null)
  const [form, setForm] = useState({ title: '', description: '', icon: '', link: '', is_active: true })
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['portal', 'solutions'] })
  const createMutation = useMutation({ mutationFn: portalApi.createSolution, onSuccess: invalidate })
  const updateMutation = useMutation({ mutationFn: ({ id, payload }: { id: number; payload: Partial<PortalSolution> }) => portalApi.updateSolution(id, payload), onSuccess: invalidate })
  const deleteMutation = useMutation({ mutationFn: portalApi.deleteSolution, onSuccess: invalidate })

  const reset = () => {
    setEditing(null)
    setForm({ title: '', description: '', icon: '', link: '', is_active: true })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: form })
    } else {
      createMutation.mutate(form)
    }
    reset()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>解决方案管理</CardTitle>
          <CardDescription>增删改官网解决方案卡片。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <Input placeholder="标题" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            <Input placeholder="图标" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} />
            <Input placeholder="描述" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
            <Input placeholder="链接" value={form.link} onChange={(event) => setForm({ ...form, link: event.target.value })} />
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit">{editing ? '保存修改' : '新增方案'}</Button>
              {editing ? <Button type="button" variant="outline" onClick={reset}>取消编辑</Button> : null}
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          {query.isLoading ? <div className="text-muted-foreground">正在加载...</div> : null}
          {query.isError ? <div className="text-destructive">解决方案加载失败</div> : null}
          {!query.isLoading && !query.isError && query.data?.length === 0 ? <div className="text-muted-foreground">暂无解决方案</div> : null}
          {query.data && query.data.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>标题</TableHead><TableHead>描述</TableHead><TableHead>链接</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
              <TableBody>
                {query.data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.link ?? '-'}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(item); setForm({ title: item.title, description: item.description, icon: item.icon ?? '', link: item.link ?? '', is_active: item.is_active ?? true }) }}>编辑</Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeletingId(item.id)}>删除</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
      <ConfirmDialog open={deletingId !== null} title="确认删除解决方案？" description="删除后将不再在官网展示。" onCancel={() => setDeletingId(null)} onConfirm={() => { if (deletingId !== null) deleteMutation.mutate(deletingId); setDeletingId(null) }} />
    </div>
  )
}
