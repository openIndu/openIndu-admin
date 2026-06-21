import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy } from 'lucide-react'
import { documentApi, syncApi, type ResourceItem } from '@/api'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ConfirmDialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'

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

const formatSize = (size?: number) => (size ? `${(size / 1024 / 1024).toFixed(2)} MB` : '-')
const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '-'
const displayName = (item: ResourceItem) => item.original_name ?? item.name ?? item.filename ?? `文档 #${item.id}`

export function DocumentList() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [keyword, setKeyword] = useState('')
  const [deleting, setDeleting] = useState<ResourceItem | null>(null)
  const [syncMode, setSyncMode] = useState<'full' | 'incremental'>('incremental')
  const [logPage, setLogPage] = useState(1)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const params = useMemo(
    () => ({ page, size: 10, brand: brand || undefined, category: category || undefined, keyword: keyword || undefined }),
    [brand, category, keyword, page],
  )
  const query = useQuery({
    queryKey: ['documents', params],
    queryFn: () => documentApi.list(params),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      return items.some((i) => i.sync_status === 'pending' || i.sync_status === 'syncing') ? 5_000 : false
    },
  })
  const deleteMutation = useMutation({ mutationFn: documentApi.delete, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }) })
  const publishMutation = useMutation({ mutationFn: documentApi.publishToggle, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }) })

  const syncStatusQuery = useQuery({ queryKey: ['sync', 'status'], queryFn: syncApi.status, refetchInterval: 10_000 })
  const syncLogsQuery = useQuery({ queryKey: ['sync', 'logs', logPage], queryFn: () => syncApi.logs({ page: logPage, size: 10 }) })

  const triggerSyncMutation = useMutation({
    mutationFn: (mode: 'full' | 'incremental') => syncApi.trigger(mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync', 'status'] })
      queryClient.invalidateQueries({ queryKey: ['sync', 'logs'] })
    },
  })

  const statusData = syncStatusQuery.data as Record<string, unknown> | undefined

  const handleCopyError = (logId: number, text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedId(logId)
      setTimeout(() => setCopiedId(null), 1500)
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>同步管理</CardTitle>
          <CardDescription>触发文档同步并查看同步状态和日志。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Select
                className="w-32"
                options={[
                  { value: 'incremental', label: '增量同步' },
                  { value: 'full', label: '全量同步' },
                ]}
                value={syncMode}
                onChange={(event) => setSyncMode(event.target.value as 'full' | 'incremental')}
              />
              <Button
                onClick={() => triggerSyncMutation.mutate(syncMode)}
                disabled={triggerSyncMutation.isPending}
              >
                {triggerSyncMutation.isPending ? '触发中...' : '触发同步'}
              </Button>
            </div>
            {statusData ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  状态：<Badge variant={statusData.status === 'running' ? 'warning' : statusData.status === 'idle' ? 'success' : 'secondary'}>{String(statusData.status ?? '未知')}</Badge>
                </span>
                {statusData.last_sync_time ? <span className="text-muted-foreground">上次同步：{String(statusData.last_sync_time)}</span> : null}
                {statusData.pending_count !== undefined ? <span className="text-muted-foreground">待同步：{String(statusData.pending_count)} 个文档</span> : null}
              </div>
            ) : null}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium">同步日志</h4>
            {syncLogsQuery.isLoading ? <div className="text-sm text-muted-foreground">正在加载日志...</div> : null}
            {syncLogsQuery.isError ? <div className="text-sm text-destructive">日志加载失败</div> : null}
            {!syncLogsQuery.isLoading && !syncLogsQuery.isError && syncLogsQuery.data?.items.length === 0 ? <div className="text-sm text-muted-foreground">暂无同步日志</div> : null}
            {syncLogsQuery.data && syncLogsQuery.data.items.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>文档 ID</TableHead>
                      <TableHead>操作</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>错误信息</TableHead>
                      <TableHead>同步时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogsQuery.data.items.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.document_id ?? '-'}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'success' ? 'success' : 'destructive'}>{log.status}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {log.error_message ? (
                            <div className="group relative flex items-center gap-1">
                              <span className="truncate">{log.error_message}</span>
                              {/* 悬停时显示完整错误信息 */}
                              <div className="absolute bottom-full left-0 z-20 mb-1 hidden w-96 rounded-md border bg-popover p-3 text-xs shadow-lg group-hover:block">
                                <pre className="whitespace-pre-wrap break-all">{log.error_message}</pre>
                              </div>
                              <button
                                onClick={() => handleCopyError(log.id, log.error_message ?? '')}
                                className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                title="复制错误信息"
                              >
                                {copiedId === log.id ? (
                                  <span className="text-[10px] text-green-600">已复制</span>
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{log.sync_time ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>共 {syncLogsQuery.data.total} 条</span>
                  <div className="space-x-2">
                    <Button size="sm" variant="outline" disabled={logPage <= 1} onClick={() => setLogPage(logPage - 1)}>上一页</Button>
                    <Button size="sm" variant="outline" disabled={logPage * 10 >= syncLogsQuery.data.total} onClick={() => setLogPage(logPage + 1)}>下一页</Button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div><CardTitle>文档管理</CardTitle><CardDescription>按品牌、分类和关键词筛选文档，支持上传和删除。</CardDescription></div>
          <Button asChild><Link to="/documents/upload">上传文档</Link></Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <Select placeholder="全部品牌" options={brandOptions} value={brand} onChange={(event) => { setBrand(event.target.value); setPage(1) }} />
            <Select placeholder="全部分类" options={categoryOptions} value={category} onChange={(event) => { setCategory(event.target.value); setPage(1) }} />
            <Input placeholder="关键词" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1) }} />
            <Button variant="outline" onClick={() => void query.refetch()}>查询</Button>
          </div>
          {query.isLoading ? <div className="text-muted-foreground">正在加载文档...</div> : null}
          {query.isError ? <div className="text-destructive">文档列表加载失败</div> : null}
          {!query.isLoading && !query.isError && query.data?.items.length === 0 ? <div className="text-muted-foreground">暂无文档</div> : null}
          {query.data && query.data.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>品牌</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>大小</TableHead>
                  <TableHead>上传时间</TableHead>
                  <TableHead>下载次数</TableHead>
                  <TableHead>同步状态</TableHead>
                  <TableHead>发布状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[200px] truncate" title={displayName(item)}>{displayName(item)}</TableCell>
                    <TableCell>{item.brand}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{formatSize(item.file_size)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(item.upload_time)}</TableCell>
                    <TableCell>{item.download_count ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={item.sync_status === 'synced' ? 'success' : item.sync_status === 'failed' ? 'destructive' : 'warning'}>
                        {item.sync_status ?? 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_published ? 'success' : 'secondary'}>
                        {item.is_published ? '已发布' : '未发布'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={item.is_published ? 'outline' : 'default'}
                          onClick={() => publishMutation.mutate(item.id)}
                          disabled={publishMutation.isPending}
                        >
                          {item.is_published ? '取消发布' : '发布'}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleting(item)}>删除</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
          {query.data ? (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>共 {query.data.total} 条</span>
              <div className="space-x-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                <Button size="sm" variant="outline" disabled={page * 10 >= query.data.total} onClick={() => setPage(page + 1)}>下一页</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={deleting !== null}
        title="确认删除文档？"
        description={deleting ? displayName(deleting) : undefined}
        onCancel={() => setDeleting(null)}
        onConfirm={() => { if (deleting) deleteMutation.mutate(deleting.id); setDeleting(null) }}
      />
    </div>
  )
}
