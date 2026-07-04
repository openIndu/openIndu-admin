import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { softwareApi, tagsApi, type ResourceTag, type SoftwareItem, type SoftwareUploadPart } from '@/api'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ConfirmDialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Paperclip, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { uploadToOss, UploadCancelledError } from './directUpload'

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

interface SoftwareVersion {
  id: number
  version: string
  file_size?: number
  download_count?: number
  created_at?: string
}

const displayName = (item: SoftwareItem) => item.original_name ?? item.name ?? item.filename ?? `软件 #${item.id}`

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

const humanSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}
const humanRate = (bytesPerSec: number): string => {
  if (!bytesPerSec || bytesPerSec <= 0) return '-'
  return `${humanSize(bytesPerSec)}/s`
}

export function SoftwareList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const versionFileRef = useRef<HTMLInputElement>(null)
  const versionAbortRef = useRef<AbortController | null>(null)
  const versionSampleRef = useRef<{ loaded: number; t: number } | null>(null)
  const [versionPhase, setVersionPhase] = useState<'idle' | 'uploading' | 'finalizing'>('idle')
  const [versionLoaded, setVersionLoaded] = useState(0)
  const [versionTotal, setVersionTotal] = useState(0)
  const [versionRate, setVersionRate] = useState(0)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [jumpInput, setJumpInput] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState<string>('upload_time')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectAllMatching, setSelectAllMatching] = useState(false)
  const [confirmBulk, setConfirmBulk] = useState<{ publish: boolean } | null>(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [deleting, setDeleting] = useState<SoftwareItem | null>(null)
  const [editing, setEditing] = useState<SoftwareItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editBrand, setEditBrand] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [versionsModal, setVersionsModal] = useState<{ item: SoftwareItem; versions: SoftwareVersion[] } | null>(null)
  const [addVersionFile, setAddVersionFile] = useState<File | null>(null)
  const [addVersionValue, setAddVersionValue] = useState('')
  const [addVersionError, setAddVersionError] = useState('')

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortOrder('desc')
    }
    setPage(1)
  }
  const [deletingVersion, setDeletingVersion] = useState<{ softwareId: number; versionId: number } | null>(null)

  const toTagArray = (d: unknown): ResourceTag[] => (Array.isArray(d) ? (d as ResourceTag[]) : [])
  const brandsQuery = useQuery({ queryKey: ['tags', 'sw_brand'], queryFn: () => tagsApi.list('sw_brand'), select: toTagArray })
  const categoriesQuery = useQuery({ queryKey: ['tags', 'sw_category'], queryFn: () => tagsApi.list('sw_category'), select: toTagArray })

  const brandChips = useMemo(() => (brandsQuery.data ?? []).filter((t) => t.is_active).map((t) => ({ value: t.value, label: t.label_zh })), [brandsQuery.data])
  const categoryChips = useMemo(() => (categoriesQuery.data ?? []).filter((t) => t.is_active).map((t) => ({ value: t.value, label: t.label_zh })), [categoriesQuery.data])

  const brandMap = useMemo(() => Object.fromEntries(brandChips.map((c) => [c.value, c.label])), [brandChips])
  const categoryMap = useMemo(() => Object.fromEntries(categoryChips.map((c) => [c.value, c.label])), [categoryChips])

  const params = useMemo(() => ({ page, size, brand: brand || undefined, category: category || undefined, keyword: keyword || undefined, expand_versions: true, sort_by: sortBy, sort_order: sortOrder }), [brand, category, keyword, page, size, sortBy, sortOrder])
  const query = useQuery({ queryKey: ['software', params], queryFn: () => softwareApi.list(params) })
  const deleteMutation = useMutation({ mutationFn: softwareApi.delete, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['software'] }) })
  const publishMutation = useMutation({
    mutationFn: ({ id, versionId }: { id: number; versionId?: number }) =>
      versionId ? softwareApi.publishVersionToggle(id, versionId) : softwareApi.publishToggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['software'] }),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof softwareApi.update>[1] }) => softwareApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['software'] }); setEditing(null) },
  })

  const invalidateSoftware = () => queryClient.invalidateQueries({ queryKey: ['software'] })
  const bulkPublishMutation = useMutation({
    mutationFn: softwareApi.bulkPublish,
    onSuccess: () => {
      setSelectedIds([])
      setSelectAllMatching(false)
      invalidateSoftware()
    },
  })
  const bulkDeleteMutation = useMutation({
    mutationFn: softwareApi.bulkDelete,
    onSuccess: () => {
      setSelectedIds([])
      setSelectAllMatching(false)
      setConfirmBulkDelete(false)
      invalidateSoftware()
    },
  })
  const deleteVersionMutation = useMutation({
    mutationFn: ({ id, versionId }: { id: number; versionId: number }) => softwareApi.deleteVersion(id, versionId),
    onSuccess: () => {
      invalidateSoftware()
      setDeletingVersion(null)
      if (versionsModal) {
        softwareApi.get(versionsModal.item.id).then((data) => {
          setVersionsModal({ item: versionsModal.item, versions: (data as unknown as { versions?: SoftwareVersion[] }).versions ?? [] })
        }).catch(() => {})
      }
    },
  })

  const openVersions = async (item: SoftwareItem) => {
    try {
      const data = await softwareApi.get(item.id)
      const versions = (data as unknown as { versions?: SoftwareVersion[] }).versions ?? []
      setVersionsModal({ item, versions })
    } catch {
      setVersionsModal({ item, versions: [] })
    }
  }

  const handleDownload = async (item: SoftwareItem) => {
    try {
      // Expanded rows carry a version_id — use the per-version download
      // link to hit the exact version instead of always fetching the latest.
      const link = item.version_id
        ? await softwareApi.downloadVersionLink(item.id, item.version_id)
        : await softwareApi.downloadLink(item.id)
      const { download_url, filename } = link
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

  const handleAddVersion = async () => {
    if (!versionsModal) return
    if (!addVersionValue.trim()) { setAddVersionError('请填写版本号'); return }
    if (!addVersionFile) { setAddVersionError('请选择软件包文件'); return }
    setAddVersionError('')

    const file = addVersionFile!
    const item = versionsModal.item
    const versionTag = addVersionValue.trim()
    // Don't clear the form state until we actually use it — the previous
    // version of this code zeroed addVersionValue before the init call ran,
    // so the API was sent an empty version string and complete silently
    // wrote a versionless row, leaving the UI stuck on "finalizing".
    setVersionTotal(file.size)
    setVersionLoaded(0)
    setVersionRate(0)
    setVersionPhase('uploading')
    versionSampleRef.current = { loaded: 0, t: Date.now() }

    const controller = new AbortController()
    versionAbortRef.current = controller

    try {
      const init = await softwareApi.uploadInit({
        filename: file.name,
        brand: item.brand,
        category: item.category,
        version: versionTag,
        content_type: file.type || 'application/octet-stream',
        size: file.size,
        software_id: item.id,
      })

      let parts: SoftwareUploadPart[] | null = null
      if (init.mode === 'sync') {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('version', versionTag)
        await softwareApi.addVersion(item.id, formData, (e) => {
          if (e.total) {
            setVersionLoaded(e.loaded)
            setVersionTotal(e.total)
            const now = Date.now()
            const prev = versionSampleRef.current
            if (prev && now - prev.t >= 800) {
              setVersionRate(((e.loaded - prev.loaded) * 1000) / (now - prev.t))
              versionSampleRef.current = { loaded: e.loaded, t: now }
            }
          }
        })
      } else {
        parts = await uploadToOss(file, init, (l, t) => {
          setVersionLoaded(l); setVersionTotal(t)
          const now = Date.now()
          const prev = versionSampleRef.current
          if (prev && now - prev.t >= 800) {
            setVersionRate(((l - prev.loaded) * 1000) / (now - prev.t))
            versionSampleRef.current = { loaded: l, t: now }
          }
        }, controller.signal)
      }

      setVersionPhase('finalizing')
      setVersionRate(0)
      if (init.mode !== 'sync' && init.token) {
        await softwareApi.uploadComplete({ token: init.token, parts: parts ?? undefined })
      }
      await invalidateSoftware()
      // Reset modal state and navigate to refreshed list.
      setVersionsModal(null)
      setAddVersionFile(null)
      setAddVersionValue('')
      setVersionPhase('idle')
      setVersionLoaded(0)
      setVersionTotal(0)
      setVersionRate(0)
      navigate('/software')
    } catch (err) {
      if (err instanceof UploadCancelledError) {
        setVersionPhase('idle')
        setVersionLoaded(0)
        setVersionRate(0)
        return
      }
      const e = err as { response?: { data?: { detail?: string; message?: string } }; message?: string }
      setAddVersionError(e?.response?.data?.detail || e?.response?.data?.message || e?.message || '版本上传失败')
      setVersionPhase('idle')
      setVersionLoaded(0)
      setVersionRate(0)
    } finally {
      versionAbortRef.current = null
    }
  }

  const openEdit = (item: SoftwareItem) => {
    setEditing(item)
    setEditName(displayName(item))
    setEditBrand(item.brand)
    setEditCategory(item.category)
    setEditDescription(item.description ?? '')
  }

  const formatSize = (size?: number) => {
    if (!size || size <= 0) return '-'
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
    return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`
  }
  const totalPages = query.data ? Math.ceil(query.data.total / size) : 0
  const currentItems = query.data?.items ?? []
  // Selection now operates on version rows (one checkbox per row). The list
  // is fetched with expand_versions=true so the same software_id can appear
  // multiple times; we identify each row by version_id.
  const currentVersionIds = useMemo(
    () => currentItems.map((it) => it.version_id).filter((id): id is number => typeof id === 'number'),
    [currentItems],
  )
  const total = query.data?.total ?? 0
  const allCurrentSelected = currentVersionIds.length > 0 && currentVersionIds.every((id) => selectedIds.includes(id))
  const selectedCount = selectedIds.length
  const hasSelection = selectAllMatching || selectedCount > 0
  const selectionLabel = selectAllMatching ? ` (全部 ${total})` : selectedCount ? ` (${selectedCount})` : ''
  const showSelectAllBanner = allCurrentSelected && total > currentVersionIds.length

  const toggleCurrentPageSelection = () => {
    if (allCurrentSelected) {
      setSelectAllMatching(false)
      setSelectedIds((ids) => ids.filter((id) => !currentVersionIds.includes(id)))
      return
    }
    setSelectedIds((ids) => Array.from(new Set([...ids, ...currentVersionIds])))
  }

  const toggleRowSelection = (id: number) => {
    setSelectAllMatching(false)
    setSelectedIds((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id])
  }

  // Changing the filter invalidates the current selection scope.
  useEffect(() => {
    setSelectedIds([])
    setSelectAllMatching(false)
  }, [brand, category])

  const publishSelected = (publish: boolean) => {
    if (selectedIds.length === 0) return
    bulkPublishMutation.mutate({ version_ids: selectedIds, publish })
  }

  const publishFiltered = (publish: boolean) => {
    bulkPublishMutation.mutate({ brand: brand || undefined, category: category || undefined, keyword: keyword || undefined, publish })
  }

  const handleJump = () => {
    const n = parseInt(jumpInput, 10)
    if (!isNaN(n) && n >= 1 && n <= totalPages) { setPage(n); setJumpInput('') }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div><CardTitle>软件管理</CardTitle><CardDescription>按品牌、分类和关键词筛选软件包，支持上传、编辑和删除。</CardDescription></div>
          <Button asChild><Link to="/software/upload">上传软件</Link></Button>
        </CardHeader>
        <CardContent>
          {/* Cascading chip filter — same pattern as DocumentList */}
          <div className="mb-5 space-y-3 rounded-lg border bg-muted/30 px-4 py-3">
            <ChipBar
              label="品牌："
              chips={brandChips}
              selected={brand}
              onSelect={(v) => { setBrand(v); setPage(1) }}
            />
            <ChipBar
              label="类型："
              chips={categoryChips}
              selected={category}
              onSelect={(v) => { setCategory(v); setPage(1) }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="h-8 max-w-xs"
                placeholder="关键词搜索..."
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
              />
              <Button size="sm" variant="outline" onClick={() => void query.refetch()}>查询</Button>
              {(brand || category || keyword) ? (
                <Button size="sm" variant="ghost" onClick={() => { setBrand(''); setCategory(''); setKeyword(''); setPage(1) }}>
                  清空筛选
                </Button>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => setConfirmBulk({ publish: true })} disabled={!hasSelection || bulkPublishMutation.isPending}>
                批量发布{selectionLabel}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmBulk({ publish: false })} disabled={!hasSelection || bulkPublishMutation.isPending}>
                批量取消发布{selectionLabel}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setConfirmBulkDelete(true)} disabled={!hasSelection || bulkDeleteMutation.isPending}>
                批量删除{selectionLabel}
              </Button>
              {bulkPublishMutation.data ? <span className="text-xs text-muted-foreground">已{bulkPublishMutation.data.publish ? '发布' : '取消发布'} {bulkPublishMutation.data.count} 个软件</span> : null}
            </div>
          </div>

          {showSelectAllBanner ? (
            <div className="mb-4 flex flex-wrap items-center justify-center gap-3 rounded-md border border-primary/40 bg-primary/5 px-4 py-2.5 text-sm">
              {selectAllMatching ? (
                <>
                  <span>已选择全部 <span className="font-semibold">{total}</span> 个匹配软件。</span>
                  <Button size="sm" variant="outline" onClick={() => { setSelectAllMatching(false); setSelectedIds([]) }}>清除选择</Button>
                </>
              ) : (
                <>
                  <span>已选择本页 <span className="font-semibold">{currentVersionIds.length}</span> 项，仅对本页生效。</span>
                  <Button size="sm" onClick={() => setSelectAllMatching(true)}>选择全部 {total} 个匹配版本</Button>
                </>
              )}
            </div>
          ) : null}

          {query.isLoading ? <div className="text-muted-foreground">正在加载软件...</div> : null}
          {query.isError ? <div className="text-destructive">软件列表加载失败</div> : null}
          {!query.isLoading && !query.isError && query.data?.items.length === 0 ? <div className="text-muted-foreground">暂无软件</div> : null}
          {query.data && query.data.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input type="checkbox" checked={allCurrentSelected} onChange={toggleCurrentPageSelection} aria-label="选择当前页软件" />
                  </TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>品牌</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>版本</TableHead>
                  <SortableHead
                    label="大小"
                    sortKey="file_size"
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
                  <TableHead>发布状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((item) => (
                  <TableRow key={`${item.id}-${item.version_id ?? 'none'}`}>
                    <TableCell>
                      {/* One checkbox per version row — publish is version-scoped. */}
                      {item.version_id !== undefined ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.version_id)}
                          onChange={() => toggleRowSelection(item.version_id!)}
                          aria-label={`选择 ${displayName(item)} ${item.version ?? ''}`}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell>{displayName(item)}</TableCell>
                    <TableCell>{brandMap[item.brand] ?? item.brand}</TableCell>
                    <TableCell>{categoryMap[item.category] ?? item.category}</TableCell>
                    <TableCell>
                      <span>{item.version ?? item.latest_version ?? '-'}</span>
                      {item.is_latest_version && (
                        <Badge variant="success" className="ml-1.5 text-[10px] px-1 py-0">最新</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatSize(item.latest_version_size)}</TableCell>
                    <TableCell>{item.download_count ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_published ? 'success' : 'secondary'}>
                        {item.is_published ? '已发布' : '未发布'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(item)}>编辑</Button>
                        <Button size="sm" variant="outline" onClick={() => openVersions(item)}>版本</Button>
                        <Button size="sm" variant="outline" onClick={() => handleDownload(item)}>下载</Button>
                        <Button
                          size="sm"
                          variant={item.is_published ? 'outline' : 'default'}
                          onClick={() => publishMutation.mutate({ id: item.id, versionId: item.version_id })}
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

      {/* Edit modal */}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">编辑软件</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>关闭</Button>
            </div>
            <div className="space-y-3">
              <label className="block space-y-1 text-sm">
                <span>显示名</span>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>品牌</span>
                <Select options={brandChips} value={editBrand} onChange={(e) => setEditBrand(e.target.value)} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>类型</span>
                <Select options={categoryChips} value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
              </label>
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
                onClick={() => updateMutation.mutate({ id: editing.id, data: { original_name: editName, brand: editBrand, category: editCategory, description: editDescription } })}
              >
                {updateMutation.isPending ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Versions Modal */}
      {versionsModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-auto rounded-xl border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">版本管理 - {displayName(versionsModal.item)}</h3>
              <Button variant="ghost" size="sm" onClick={() => { setVersionsModal(null); setAddVersionFile(null); setAddVersionValue(''); setAddVersionError('') }}>关闭</Button>
            </div>
            <div className="mb-4 rounded-lg border p-4">
              <label className="mb-2 block text-sm font-medium">添加新版本</label>
              <div className="grid gap-3 md:grid-cols-[160px_1fr_120px]">
                <Input placeholder="版本号，如 2.1.0" value={addVersionValue} onChange={(event) => setAddVersionValue(event.target.value)} />
                <div
                  onClick={() => versionFileRef.current?.click()}
                  className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                >
                  <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className={`overflow-hidden text-ellipsis whitespace-nowrap ${addVersionFile ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {addVersionFile ? addVersionFile.name : '点击选择软件包'}
                  </span>
                </div>
                <input
                  ref={versionFileRef}
                  type="file"
                  accept=".zip,.exe,.msi,.rar,.7z"
                  className="sr-only"
                  onChange={(event) => { setAddVersionFile(event.target.files?.[0] ?? null); setAddVersionError('') }}
                />
                <Button className="w-full whitespace-nowrap" disabled={versionPhase !== 'idle'} onClick={() => void handleAddVersion()}>
                  {versionPhase === 'uploading' ? '上传中...' : versionPhase === 'finalizing' ? '处理中...' : '添加版本'}
                </Button>
              </div>
              {(versionPhase === 'uploading' || versionPhase === 'finalizing') ? (
                <div className="mt-2 space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full bg-primary transition-all duration-150 ${versionPhase === 'finalizing' ? 'animate-pulse' : ''}`}
                      style={{ width: `${versionPhase === 'finalizing' ? 100 : (versionTotal > 0 ? Math.min(100, Math.round((versionLoaded / versionTotal) * 100)) : 0)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {versionPhase === 'uploading' ? (
                      <>
                        <span>{humanSize(versionLoaded)} / {humanSize(versionTotal)} ({versionTotal > 0 ? Math.min(100, Math.round((versionLoaded / versionTotal) * 100)) : 0}%)</span>
                        <span>{humanRate(versionRate)}</span>
                      </>
                    ) : (
                      <span>文件已上传，正在合并并写入数据库...</span>
                    )}
                  </div>
                </div>
              ) : null}
              {addVersionError ? <div className="mt-2 text-sm text-destructive">{addVersionError}</div> : null}
            </div>
            {versionsModal.versions.length === 0 ? (
              <div className="text-sm text-muted-foreground">暂无版本记录</div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>版本号</TableHead><TableHead>文件大小</TableHead><TableHead>下载次数</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
                <TableBody>
                  {versionsModal.versions.map((ver) => (
                    <TableRow key={ver.id}>
                      <TableCell><Badge variant="secondary">{ver.version}</Badge></TableCell>
                      <TableCell>{formatSize(ver.file_size)}</TableCell>
                      <TableCell>{ver.download_count ?? 0}</TableCell>
                      <TableCell>{ver.created_at ?? '-'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="destructive" onClick={() => setDeletingVersion({ softwareId: versionsModal.item.id, versionId: ver.id })}>删除</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      ) : null}

      <ConfirmDialog open={deleting !== null} title="确认删除软件？" description={deleting ? displayName(deleting) : undefined} onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) deleteMutation.mutate(deleting.id); setDeleting(null) }} />
      <ConfirmDialog
        open={confirmBulk !== null}
        title={confirmBulk?.publish ? '确认批量发布？' : '确认批量取消发布？'}
        description={
          selectAllMatching
            ? (confirmBulk?.publish
                ? `将发布当前筛选条件下全部 ${total} 个软件。`
                : `将取消发布当前筛选条件下全部 ${total} 个软件，它们会从官网下架。`)
            : (confirmBulk?.publish
                ? `将发布已选中的 ${selectedCount} 个软件。`
                : `将取消发布已选中的 ${selectedCount} 个软件，它们会从官网下架。`)
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
        open={confirmBulkDelete}
        title="确认批量删除？"
        description={
          selectAllMatching
            ? `将删除当前筛选条件下全部 ${total} 个软件及其所有版本文件，此操作不可撤销。`
            : `将删除已选中的 ${selectedCount} 个版本，若软件无剩余版本则一并删除软件。此操作不可撤销。`
        }
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={() => {
          if (selectAllMatching) {
            bulkDeleteMutation.mutate({ brand: brand || undefined, category: category || undefined, keyword: keyword || undefined })
          } else {
            bulkDeleteMutation.mutate({ version_ids: selectedIds })
          }
        }}
      />
      <ConfirmDialog
        open={deletingVersion !== null}
        title="确认删除版本？"
        description="删除后该版本将不可恢复。"
        onCancel={() => setDeletingVersion(null)}
        onConfirm={() => { if (deletingVersion) deleteVersionMutation.mutate({ id: deletingVersion.softwareId, versionId: deletingVersion.versionId }) }}
      />
    </div>
  )
}
