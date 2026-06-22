import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tagsApi, type ResourceTag } from '@/api'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ConfirmDialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Tabs } from '../../components/ui/tabs'

const TAB_TYPES = [
  { value: 'brand', label: '品牌' },
  { value: 'doc_category', label: '文档分类' },
  { value: 'sw_category', label: '软件分类' },
]

function TagTable({ type }: { type: string }) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tags', type] })

  const { data: tags = [], isLoading } = useQuery({ queryKey: ['tags', type], queryFn: () => tagsApi.list(type) })

  const [newValue, setNewValue] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [createError, setCreateError] = useState('')

  const createMutation = useMutation({
    mutationFn: tagsApi.create,
    onSuccess: () => { invalidate(); setNewValue(''); setNewLabel(''); setCreateError('') },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setCreateError(err?.response?.data?.message ?? '创建失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof tagsApi.update>[1] }) => tagsApi.update(id, data),
    onSuccess: () => { invalidate(); setEditingId(null) },
  })

  const removeMutation = useMutation({
    mutationFn: tagsApi.remove,
    onSuccess: () => { invalidate(); setDeletingId(null) },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: err?.response?.data?.message ?? '删除失败', type: 'error' } }))
      setDeletingId(null)
    },
  })

  const handleCreate = () => {
    if (!newValue.trim() || !newLabel.trim()) { setCreateError('标识和中文名均不能为空'); return }
    setCreateError('')
    createMutation.mutate({ type, value: newValue.trim(), label_zh: newLabel.trim(), sort_order: tags.length })
  }

  const startEdit = (tag: ResourceTag) => { setEditingId(tag.id); setEditLabel(tag.label_zh) }

  return (
    <div className="space-y-4">
      {/* Create row */}
      <div className="rounded-lg border p-4">
        <p className="mb-3 text-sm font-medium">新增标签</p>
        <div className="flex flex-wrap gap-2">
          <Input className="w-40" placeholder="标识（英文，如 abb）" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
          <Input className="w-40" placeholder="中文名（如 ABB）" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          <Button onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending ? '创建中...' : '添加'}</Button>
        </div>
        {createError ? <p className="mt-2 text-sm text-destructive">{createError}</p> : null}
      </div>

      {isLoading ? <div className="text-sm text-muted-foreground">正在加载...</div> : null}
      {!isLoading && tags.length === 0 ? <div className="text-sm text-muted-foreground">暂无标签</div> : null}
      {tags.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>标识（value）</TableHead>
              <TableHead>中文名</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell className="font-mono text-sm">{tag.value}</TableCell>
                <TableCell>
                  {editingId === tag.id ? (
                    <div className="flex items-center gap-2">
                      <Input className="w-36 h-7 text-sm" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                      <Button size="sm" onClick={() => updateMutation.mutate({ id: tag.id, data: { label_zh: editLabel } })} disabled={updateMutation.isPending}>保存</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>取消</Button>
                    </div>
                  ) : (
                    tag.label_zh
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={tag.is_active ? 'success' : 'secondary'}>{tag.is_active ? '启用' : '停用'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {editingId !== tag.id ? (
                      <Button size="sm" variant="outline" onClick={() => startEdit(tag)}>编辑</Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateMutation.mutate({ id: tag.id, data: { is_active: !tag.is_active } })}
                      disabled={updateMutation.isPending}
                    >
                      {tag.is_active ? '停用' : '启用'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeletingId(tag.id)}>删除</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <ConfirmDialog
        open={deletingId !== null}
        title="确认删除标签？"
        description="如有文档或软件仍在使用该标签，删除将被拒绝。"
        onCancel={() => setDeletingId(null)}
        onConfirm={() => { if (deletingId !== null) removeMutation.mutate(deletingId) }}
      />
    </div>
  )
}

export function TagsView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>品牌与分类管理</CardTitle>
        <CardDescription>动态维护文档/软件的品牌和分类标签，变更后立即生效于上传表单和筛选器。</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="brand"
          items={TAB_TYPES.map((t) => ({
            value: t.value,
            label: t.label,
            content: <TagTable type={t.value} />,
          }))}
        />
      </CardContent>
    </Card>
  )
}
