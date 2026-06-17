import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { portalApi } from '@/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ConfirmDialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { ChevronLeft, ChevronRight, Monitor } from 'lucide-react'

export function CarouselManager() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['portal', 'carousel'], queryFn: portalApi.getCarousel })
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editSortOrder, setEditSortOrder] = useState('')
  const [previewIndex, setPreviewIndex] = useState(0)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['portal', 'carousel'] })
  const uploadMutation = useMutation({ mutationFn: portalApi.uploadCarousel, onSuccess: invalidate })
  const deleteMutation = useMutation({ mutationFn: portalApi.deleteCarousel, onSuccess: invalidate })
  const updateMutation = useMutation({ mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => portalApi.updateCarousel(id, payload), onSuccess: invalidate })

  const handleUpload = () => {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    uploadMutation.mutate(formData)
    setFile(null)
    setTitle('')
  }

  const handleToggleActive = (id: number, current: boolean | undefined) => {
    updateMutation.mutate({ id, payload: { is_active: !current } })
  }

  const handleUpdateSortOrder = (id: number) => {
    const num = parseInt(editSortOrder, 10)
    if (isNaN(num)) return
    updateMutation.mutate({ id, payload: { sort_order: num } })
    setEditingId(null)
    setEditSortOrder('')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>轮播图管理</CardTitle>
          <CardDescription>上传官网轮播图片并管理展示状态。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="图片标题" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <Button type="button" disabled={!file || uploadMutation.isPending} onClick={handleUpload}>{uploadMutation.isPending ? '上传中...' : '上传轮播图'}</Button>
        </CardContent>
      </Card>

      {/* Preview Carousel */}
      {query.data && query.data.length > 0 && (() => {
        const activeItems = query.data.filter((item) => item.is_active !== false)
        if (activeItems.length === 0) return null
        const current = activeItems[previewIndex % activeItems.length]
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                轮播预览
              </CardTitle>
              <CardDescription>轮播图在前台首页的展示效果。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <div className="relative flex h-56 items-center justify-center bg-muted">
                  {current.image_url ? (
                    <img src={current.image_url} alt={current.title ?? ''} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Monitor className="h-8 w-8" />
                      <span className="text-sm">无预览图片</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                    <h3 className="mb-1 text-xl font-bold text-white">{current.title || '未设置标题'}</h3>
                  </div>
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-1 text-white hover:bg-white/40"
                    onClick={() => setPreviewIndex((i) => (i - 1 + activeItems.length) % activeItems.length)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-1 text-white hover:bg-white/40"
                    onClick={() => setPreviewIndex((i) => (i + 1) % activeItems.length)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 flex gap-1.5">
                    {activeItems.map((_, idx) => (
                      <button
                        key={idx}
                        className={`h-2 w-2 rounded-full transition-colors ${idx === previewIndex % activeItems.length ? 'bg-white' : 'bg-white/40'}`}
                        onClick={() => setPreviewIndex(idx)}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between bg-muted/30 p-3 text-xs text-muted-foreground">
                  <span>{previewIndex + 1} / {activeItems.length} — {current.title || '(无标题)'}</span>
                  <Badge variant="success" className="text-xs">已启用</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      <Card>
        <CardContent className="pt-6">
          {query.isLoading ? <div className="text-muted-foreground">正在加载...</div> : null}
          {query.isError ? <div className="text-destructive">轮播图加载失败</div> : null}
          {!query.isLoading && !query.isError && query.data?.length === 0 ? <div className="text-muted-foreground">暂无轮播图</div> : null}
          {query.data && query.data.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>标题</TableHead><TableHead>图片</TableHead><TableHead>排序</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
              <TableBody>
                {query.data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.title ?? '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.image_url}</TableCell>
                    <TableCell>
                      {editingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <Input className="w-20" type="number" value={editSortOrder} onChange={(event) => setEditSortOrder(event.target.value)} />
                          <Button size="sm" variant="outline" onClick={() => handleUpdateSortOrder(item.id)}>确定</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditSortOrder('') }}>取消</Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer text-primary hover:underline"
                          onClick={() => { setEditingId(item.id); setEditSortOrder(String(item.sort_order ?? 0)) }}
                        >
                          {item.sort_order ?? '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={item.is_active !== false}
                          onChange={() => handleToggleActive(item.id, item.is_active)}
                        />
                        <span className="text-sm">{item.is_active === false ? '停用' : '启用'}</span>
                      </label>
                    </TableCell>
                    <TableCell><Button size="sm" variant="destructive" onClick={() => setDeletingId(item.id)}>删除</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
      <ConfirmDialog open={deletingId !== null} title="确认删除轮播图？" onCancel={() => setDeletingId(null)} onConfirm={() => { if (deletingId !== null) deleteMutation.mutate(deletingId); setDeletingId(null) }} />
    </div>
  )
}
