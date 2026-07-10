import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, ListChecks, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { documentApi, syncApi, tagsApi, type ResourceItem, type ResourceTag } from '@/api'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ConfirmDialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'

function SortableHead({
  label,
  sortKey,
  currentSortBy,
  currentSortOrder,
  onSort,
  className,
}: {
  label: string
  sortKey: string
  currentSortBy?: string
  currentSortOrder?: 'asc' | 'desc'
  onSort: (key: string) => void
  className?: string
}) {
  const isActive = currentSortBy === sortKey
  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/50 ${className || ''}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentSortOrder === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  )
}

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 条/页' },
  { value: '20', label: '20 条/页' },
  { value: '50', label: '50 条/页' },
]

// Sync-log action codes → Chinese labels. "scan" is a whole-library scan
// performed once per sync cycle and is not tied to any single document, so its
// document-id column is intentionally empty (shown as 全部).
const SYNC_ACTION_LABELS: Record<string, string> = {
  scan: '全库扫描',
  add: '新增',
  update: '更新',
  delete: '删除',
}

const formatSize = (size?: number) => (size ? `${(size / 1024 / 1024).toFixed(2)} MB` : '-')
const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    : '-'
const displayName = (item: ResourceItem) => item.original_name ?? item.name ?? item.filename ?? `文档 #${item.id}`

function ChipBar({ label, chips, selected, onSelect }: { label: string; chips: { value: string; label: string }[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="shrink-0 font-medium text-muted-foreground">{label}</span>
      {[{ value: '', label: '全部' }, ...chips].map((chip) => (
        <button
          key={chip.value}
          onClick={() => onSelect(chip.value)}
          className={`rounded-full border px-3 py-0.5 text-xs transition-colors ${
            selected === chip.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background hover:border-primary/50 hover:bg-muted'
          }`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}

export function DocumentList() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [jumpInput, setJumpInput] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [series, setSeries] = useState('')
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState<string>('upload_time')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectAllMatching, setSelectAllMatching] = useState(false)
  const [confirmBulk, setConfirmBulk] = useState<{ publish: boolean } | null>(null)
  const [deleting, setDeleting] = useState<ResourceItem | null>(null)
  const [editing, setEditing] = useState<ResourceItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editBrand, setEditBrand] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editSeries, setEditSeries] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [logPage, setLogPage] = useState(1)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const handleSort = (key: string) => {
    if (sortBy === key) {
      // Toggle order if same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to desc
      setSortBy(key)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const toTagArray = (d: unknown): ResourceTag[] => (Array.isArray(d) ? (d as ResourceTag[]) : [])
  const brandsQuery = useQuery({ queryKey: ['tags', 'doc_brand'], queryFn: () => tagsApi.list('doc_brand'), select: toTagArray })
  const categoriesQuery = useQuery({ queryKey: ['tags', 'doc_category'], queryFn: () => tagsApi.list('doc_category'), select: toTagArray })
  const allSeriesQuery = useQuery({ queryKey: ['tags', 'doc_series', 'all'], queryFn: () => tagsApi.list('doc_series'), select: toTagArray })
  const seriesQuery = useQuery({
    queryKey: ['tags', 'doc_series', category, brand],
    queryFn: () => tagsApi.list('doc_series', category, brand || undefined),
    enabled: !!category,
    select: toTagArray,
  })
  const editSeriesQuery = useQuery({
    queryKey: ['tags', 'doc_series', editCategory, editBrand],
    queryFn: () => tagsApi.list('doc_series', editCategory, editBrand || undefined),
    enabled: !!editCategory,
    select: toTagArray,
  })

  const brandChips = useMemo(() => (brandsQuery.data ?? []).filter((t) => t.is_active).map((t) => ({ value: t.value, label: t.label_zh })), [brandsQuery.data])
  const categoryChips = useMemo(() => (categoriesQuery.data ?? []).filter((t) => t.is_active).map((t) => ({ value: t.value, label: t.label_zh })), [categoriesQuery.data])
  const seriesChips = useMemo(() => (seriesQuery.data ?? []).filter((t) => t.is_active).map((t) => ({ value: t.value, label: t.label_zh })), [seriesQuery.data])
  const editSeriesChips = useMemo(() => (editSeriesQuery.data ?? []).filter((t) => t.is_active).map((t) => ({ value: t.value, label: t.label_zh })), [editSeriesQuery.data])

  const brandMap = useMemo(() => Object.fromEntries(brandChips.map((c) => [c.value, c.label])), [brandChips])
  const categoryMap = useMemo(() => Object.fromEntries(categoryChips.map((c) => [c.value, c.label])), [categoryChips])
  const allSeriesMap = useMemo(() => {
    const m: Record<string, string> = {}
    ;(allSeriesQuery.data ?? []).forEach((t) => { m[t.value] = t.label_zh })
    ;(seriesQuery.data ?? []).forEach((t) => { m[t.value] = t.label_zh })
    ;(editSeriesQuery.data ?? []).forEach((t) => { m[t.value] = t.label_zh })
    return m
  }, [allSeriesQuery.data, seriesQuery.data, editSeriesQuery.data])

  const params = useMemo(
    () => ({ page, size, brand: brand || undefined, category: category || undefined, series: series || undefined, keyword: keyword || undefined, sort_by: sortBy, sort_order: sortOrder }),
    [brand, category, series, keyword, page, size, sortBy, sortOrder],
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

  const handleDownload = async (item: ResourceItem) => {
    try {
      const { download_url, filename } = await documentApi.downloadLink(item.id)
      const a = document.createElement('a')
      a.href = download_url
      a.download = filename ?? displayName(item)
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } }
      window.alert(e?.response?.data?.detail ?? '下载失败，请稍后重试')
    }
  }
  const bulkPublishMutation = useMutation({
    mutationFn: documentApi.bulkPublish,
    onSuccess: () => {
      setSelectedIds([])
      setSelectAllMatching(false)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
  const syncMutation = useMutation({ mutationFn: documentApi.sync, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }) })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof documentApi.update>[1] }) => documentApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['documents'] }); setEditing(null) },
  })

  const syncStatusQuery = useQuery({ queryKey: ['sync', 'status'], queryFn: syncApi.status, refetchInterval: 10_000 })
  const syncLogsQuery = useQuery({ queryKey: ['sync', 'logs', logPage], queryFn: () => syncApi.logs({ page: logPage, size: 10 }) })
  const triggerSyncMutation = useMutation({
    mutationFn: () => syncApi.trigger(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync', 'status'] })
      queryClient.invalidateQueries({ queryKey: ['sync', 'logs'] })
    },
  })

  const statusData = syncStatusQuery.data as Record<string, unknown> | undefined
  // Backend reports rag_sync_enabled=false on resource-constrained nodes where
  // embedding must not run. Disable the sync buttons so a click can't fire a
  // request that the server would only reject with 503.
  const ragSyncDisabled = statusData?.rag_sync_enabled === false
  const totalPages = query.data ? Math.ceil(query.data.total / size) : 0
  const currentItems = query.data?.items ?? []
  const currentItemIds = currentItems.map((item) => item.id)
  const allCurrentSelected = currentItemIds.length > 0 && currentItemIds.every((id) => selectedIds.includes(id))
  const selectedCount = selectedIds.length
  const total = query.data?.total ?? 0
  // "Select all matching" lets a bulk action target the entire filtered set, not just the visible page.
  const hasSelection = selectAllMatching || selectedCount > 0
  const selectionLabel = selectAllMatching ? ` (全部 ${total})` : selectedCount ? ` (${selectedCount})` : ''
  const showSelectAllBanner = allCurrentSelected && total > currentItems.length

  const handleJump = () => {
    const n = parseInt(jumpInput, 10)
    if (!isNaN(n) && n >= 1 && n <= totalPages) { setPage(n); setJumpInput('') }
  }

  const toggleCurrentPageSelection = () => {
    if (allCurrentSelected) {
      setSelectAllMatching(false)
      setSelectedIds((ids) => ids.filter((id) => !currentItemIds.includes(id)))
      return
    }
    setSelectedIds((ids) => Array.from(new Set([...ids, ...currentItemIds])))
  }

  const toggleRowSelection = (id: number) => {
    // A manual row pick breaks the "all matching" semantics — fall back to explicit selection.
    setSelectAllMatching(false)
    setSelectedIds((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id])
  }

  // Changing the filter invalidates the current selection scope — clear it to avoid acting on stale picks.
  useEffect(() => {
    setSelectedIds([])
    setSelectAllMatching(false)
  }, [brand, category, series])

  const publishSelected = (publish: boolean) => {
    if (selectedIds.length === 0) return
    bulkPublishMutation.mutate({ ids: selectedIds, publish })
  }

  const publishFiltered = (publish: boolean) => {
    bulkPublishMutation.mutate({ brand: brand || undefined, category: category || undefined, series: series || undefined, keyword: keyword || undefined, publish })
  }

  const handleCopyError = (logId: number, text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedId(logId)
      setTimeout(() => setCopiedId(null), 1500)
    })
  }

  const openEdit = (item: ResourceItem) => {
    setEditing(item)
    setEditName(displayName(item))
    setEditBrand(item.brand)
    setEditCategory(item.category)
    setEditSeries(item.series ?? '')
    setEditDescription(item.description ?? '')
  }

  const editCategoryOptions = useMemo(() => categoryChips, [categoryChips])
  const editBrandOptions = useMemo(() => brandChips, [brandChips])

  return (
    <div className="space-y-6">
      {/* 文档管理 */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div><CardTitle>文档管理</CardTitle><CardDescription>按品牌、分类和关键词筛选文档，支持上传、编辑和删除。</CardDescription></div>
          <Button asChild><Link to="/documents/upload">上传文档</Link></Button>
        </CardHeader>
        <CardContent>
          {/* Cascading chip filter */}
          <div className="mb-5 space-y-3 rounded-lg border bg-muted/30 px-4 py-3">
            <ChipBar
              label="品牌："
              chips={brandChips}
              selected={brand}
              onSelect={(v) => { setBrand(v); setSeries(''); setPage(1) }}
            />
            <ChipBar
              label="类型："
              chips={categoryChips}
              selected={category}
              onSelect={(v) => { setCategory(v); setSeries(''); setPage(1) }}
            />
            {category && seriesChips.length > 0 ? (
              <ChipBar
                label="系列："
                chips={seriesChips}
                selected={series}
                onSelect={(v) => { setSeries(v); setPage(1) }}
              />
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="h-8 max-w-xs"
                placeholder="关键词搜索..."
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
              />
              <Button size="sm" variant="outline" onClick={() => void query.refetch()}>查询</Button>
              {(brand || category || series || keyword) ? (
                <Button size="sm" variant="ghost" onClick={() => { setBrand(''); setCategory(''); setSeries(''); setKeyword(''); setPage(1) }}>
                  清空筛选
                </Button>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => setConfirmBulk({ publish: true })} disabled={!hasSelection || bulkPublishMutation.isPending}>
                批量发布{selectionLabel}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmBulk({ publish: false })} disabled={!hasSelection || bulkPublishMutation.isPending}>
                批量取消发布{selectionLabel}
              </Button>
              {bulkPublishMutation.data ? <span className="text-xs text-muted-foreground">已{bulkPublishMutation.data.publish ? '发布' : '取消发布'} {bulkPublishMutation.data.count} 个文档</span> : null}
            </div>
          </div>

          {showSelectAllBanner ? (
            <div className="mb-4 flex flex-wrap items-center justify-center gap-3 rounded-md border border-primary/40 bg-primary/5 px-4 py-2.5 text-sm">
              {selectAllMatching ? (
                <>
                  <span>已选择全部 <span className="font-semibold">{total}</span> 个匹配文档。</span>
                  <Button size="sm" variant="outline" onClick={() => { setSelectAllMatching(false); setSelectedIds([]) }}>清除选择</Button>
                </>
              ) : (
                <>
                  <span>已选择本页 <span className="font-semibold">{currentItems.length}</span> 项，仅对本页生效。</span>
                  <Button size="sm" onClick={() => setSelectAllMatching(true)}>
                    <ListChecks className="h-4 w-4" />
                    选择全部 {total} 个匹配文档
                  </Button>
                </>
              )}
            </div>
          ) : null}

          {query.isLoading ? <div className="text-muted-foreground">正在加载文档...</div> : null}
          {query.isError ? <div className="text-destructive">文档列表加载失败</div> : null}
          {!query.isLoading && !query.isError && query.data?.items.length === 0 ? <div className="text-muted-foreground">暂无文档</div> : null}
          {query.data && query.data.items.length > 0 ? (
            <Table className="[&_td]:whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <input type="checkbox" checked={allCurrentSelected} onChange={toggleCurrentPageSelection} aria-label="选择当前页文档" />
                  </TableHead>
                  <TableHead>名称</TableHead>
                  <SortableHead
                    label="品牌"
                    sortKey="brand"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <TableHead>类型</TableHead>
                  <TableHead>系列</TableHead>
                  <SortableHead
                    label="大小"
                    sortKey="file_size"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="上传时间"
                    sortKey="upload_time"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="下载次数"
                    sortKey="download_count"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <TableHead>同步状态</TableHead>
                  <TableHead>发布状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleRowSelection(item.id)} aria-label={`选择 ${displayName(item)}`} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={displayName(item)}>{displayName(item)}</TableCell>
                    <TableCell>{brandMap[item.brand] ?? item.brand}</TableCell>
                    <TableCell>{categoryMap[item.category] ?? item.category}</TableCell>
                    <TableCell>{item.series ? (allSeriesMap[item.series] ?? item.series) : '-'}</TableCell>
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
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(item)}>编辑</Button>
                        <Button size="sm" variant="outline" onClick={() => handleDownload(item)}>下载</Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncMutation.mutate(item.id)}
                          disabled={ragSyncDisabled || item.sync_status === 'syncing' || (syncMutation.isPending && syncMutation.variables === item.id)}
                          title={ragSyncDisabled ? '本环境已关闭 RAG 同步，请在离线环境同步后导入向量' : undefined}
                        >
                          {syncMutation.isPending && syncMutation.variables === item.id ? '启动中...' : item.sync_status === 'syncing' ? '同步中...' : '同步'}
                        </Button>
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
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>共 {query.data.total} 条</span>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  className="w-28"
                  options={PAGE_SIZE_OPTIONS}
                  value={String(size)}
                  onChange={(e) => { setSize(Number(e.target.value)); setPage(1) }}
                />
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                <span>{page} / {totalPages || 1}</span>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
                <div className="flex items-center gap-1">
                  <span>跳至</span>
                  <Input
                    className="w-12 h-8 text-center"
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleJump() }}
                  />
                  <span>页</span>
                  <Button size="sm" variant="outline" onClick={handleJump}>Go</Button>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* 同步管理 */}
      <Card>
        <CardHeader>
          <CardTitle>同步管理</CardTitle>
          <CardDescription>触发文档同步并查看同步状态和日志。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <Button
              onClick={() => triggerSyncMutation.mutate()}
              disabled={ragSyncDisabled || triggerSyncMutation.isPending}
              title={ragSyncDisabled ? '本环境已关闭 RAG 同步，请在离线环境同步后导入向量' : undefined}
            >
              {triggerSyncMutation.isPending ? '触发中...' : '立即同步全库'}
            </Button>
            {ragSyncDisabled ? (
              <span className="text-sm text-amber-600">
                本环境已关闭 RAG 同步（资源受限），请在离线环境同步后导入向量
              </span>
            ) : statusData?.pending_count !== undefined ? (
              <span className="text-sm text-muted-foreground">
                待同步 / 失败：<span className="font-medium text-foreground">{String(statusData.pending_count)}</span> 个文档
              </span>
            ) : null}
          </div>
          <div>
            <h4 className="mb-2 text-sm font-medium">同步日志</h4>
            {syncLogsQuery.isLoading ? <div className="text-sm text-muted-foreground">正在加载日志...</div> : null}
            {syncLogsQuery.isError ? <div className="text-sm text-destructive">日志加载失败</div> : null}
            {!syncLogsQuery.isLoading && !syncLogsQuery.isError && syncLogsQuery.data?.items.length === 0 ? <div className="text-sm text-muted-foreground">暂无同步日志</div> : null}
            {syncLogsQuery.data && syncLogsQuery.data.items.length > 0 ? (
              <>
                <Table className="[&_td]:whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>文档 ID</TableHead>
                      <TableHead>文件名称</TableHead>
                      <TableHead>操作</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>错误信息</TableHead>
                      <TableHead>同步时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogsQuery.data.items.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.action === 'scan' ? (
                            <span className="text-muted-foreground" title="全库扫描，不针对单个文档">全部</span>
                          ) : (
                            log.document_id ?? '-'
                          )}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate" title={log.document_name ?? ''}>
                          {log.action === 'scan' ? (
                            <span className="text-muted-foreground">全部</span>
                          ) : (
                            log.document_name ?? '-'
                          )}
                        </TableCell>
                        <TableCell>{SYNC_ACTION_LABELS[log.action] ?? log.action}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'success' ? 'success' : 'destructive'}>{log.status}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {log.error_message ? (
                            <div className="group relative flex items-center gap-1">
                              <span className="truncate">{log.error_message}</span>
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
                          ) : '-'}
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

      {/* Edit modal */}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">编辑文档</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>关闭</Button>
            </div>
            <div className="space-y-3">
              <label className="block space-y-1 text-sm">
                <span>显示名</span>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>品牌</span>
                <Select options={editBrandOptions} value={editBrand} onChange={(e) => { setEditBrand(e.target.value); setEditSeries('') }} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>类型</span>
                <Select options={editCategoryOptions} value={editCategory} onChange={(e) => { setEditCategory(e.target.value); setEditSeries('') }} />
              </label>
              {editCategory && editSeriesChips.length > 0 ? (
                <label className="block space-y-1 text-sm">
                  <span>系列（可选）</span>
                  <Select
                    options={[{ value: '', label: '不指定系列' }, ...editSeriesChips]}
                    value={editSeries}
                    onChange={(e) => setEditSeries(e.target.value)}
                  />
                </label>
              ) : null}
              <label className="block space-y-1 text-sm">
                <span>描述</span>
                <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="可选" />
              </label>
            </div>
            {updateMutation.isError ? <div className="mt-2 text-sm text-destructive">保存失败，请重试</div> : null}
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditing(null)}>取消</Button>
              <Button
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: editing.id, data: { original_name: editName, brand: editBrand, category: editCategory, series: editSeries, description: editDescription } })}
              >
                {updateMutation.isPending ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmBulk !== null}
        title={confirmBulk?.publish ? '确认批量发布？' : '确认批量取消发布？'}
        confirmText={confirmBulk?.publish ? '发布' : '取消发布'}
        description={
          confirmBulk
            ? selectAllMatching
              ? (confirmBulk.publish
                  ? `将发布当前筛选条件下全部 ${total} 个文档。`
                  : `将取消发布当前筛选条件下全部 ${total} 个文档，它们会从官网下架。`)
              : (confirmBulk.publish
                  ? `将发布已选中的 ${selectedCount} 个文档。`
                  : `将取消发布已选中的 ${selectedCount} 个文档，它们会从官网下架。`)
            : undefined
        }
        onCancel={() => setConfirmBulk(null)}
        onConfirm={() => {
          if (confirmBulk) {
            if (selectAllMatching) publishFiltered(confirmBulk.publish)
            else publishSelected(confirmBulk.publish)
          }
          setConfirmBulk(null)
        }}
      />

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
