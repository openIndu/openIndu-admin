import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { portalApi } from '@/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ConfirmDialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'

export function CarouselManager() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['portal', 'carousel'], queryFn: portalApi.getCarousel })
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['portal', 'carousel'] })
  const uploadMutation = useMutation({ mutationFn: portalApi.uploadCarousel, onSuccess: invalidate })
  const deleteMutation = useMutation({ mutationFn: portalApi.deleteCarousel, onSuccess: invalidate })

  const handleUpload = () => {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    uploadMutation.mutate(formData)
    setFile(null)
    setTitle('')
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
                    <TableCell>{item.sort_order ?? '-'}</TableCell>
                    <TableCell>{item.is_active === false ? '停用' : '启用'}</TableCell>
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
