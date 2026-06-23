import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { softwareApi, tagsApi, type ResourceTag, type SoftwareItem } from '@/api'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ConfirmDialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Paperclip } from 'lucide-react'

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

export function SoftwareList() {
  const queryClient = useQueryClient()
  const versionFileRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [jumpInput, setJumpInput] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [keyword, setKeyword] = useState('')
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
  const [versionProgress, setVersionProgress] = useState(0)
  const [deletingVersion, setDeletingVersion] = useState<{ softwareId: number; versionId: number } | null>(null)

  const toTagArray = (d: unknown): ResourceTag[] => (Array.isArray(d) ? (d as ResourceTag[]) : [])
  const brandsQuery = useQuery({ queryKey: ['tags', 'sw_brand'], queryFn: () => tagsApi.list('sw_brand'), select: toTagArray })
  const categoriesQuery = useQuery({ queryKey: ['tags', 'sw_category'], queryFn: () => tagsApi.list('sw_category'), select: toTagArray })

  const brandChips = useMemo(() => (brandsQuery.data ?? []).filter((t) => t.is_active).map((t) => ({ value: t.value, label: t.label_zh })), [brandsQuery.data])
  const categoryChips = useMemo(() => (categoriesQuery.data ?? []).filter((t) => t.is_active).map((t) => ({ value: t.value, label: t.label_zh })), [categoriesQuery.data])

  const brandMap = useMemo(() => Object.fromEntries(brandChips.map((c) => [c.value, c.label])), [brandChips])
  const categoryMap = useMemo(() => Object.fromEntries(categoryChips.map((c) => [c.value, c.label])), [categoryChips])

  const params = useMemo(() => ({ page, size, brand: brand || undefined, category: category || undefined, keyword: keyword || undefined }), [brand, category, keyword, page, size])
  const query = useQuery({ queryKey: ['software', params], queryFn: () => softwareApi.list(params) })
  const deleteMutation = useMutation({ mutationFn: softwareApi.delete, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['software'] }) })
  const publishMutation = useMutation({ mutationFn: softwareApi.publishToggle, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['software'] }) })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof softwareApi.update>[1] }) => softwareApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['software'] }); setEditing(null) },
  })

  const invalidateSoftware = () => queryClient.invalidateQueries({ queryKey: ['software'] })
  const addVersionMutation = useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) => softwareApi.addVersion(id, formData, (e) => {
      if (e.total) setVersionProgress(Math.round((e.loaded / e.total) * 100))
    }),
    onSuccess: () => {
      invalidateSoftware()
      if (versionsModal) {
        softwareApi.get(versionsModal.item.id).then((data) => {
          setVersionsModal({ item: versionsModal.item, versions: (data as unknown as { versions?: SoftwareVersion[] }).versions ?? [] })
        }).catch(() => {})
      }
    },
    onError: () => {
      // Reset progress on any error so UI doesn't get stuck
      setVersionProgress(0)
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
      const { download_url, filename } = await softwareApi.downloadLink(item.id)
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

  const handleAddVersion = () => {
    if (!versionsModal) return
    if (!addVersionValue.trim()) { setAddVersionError('请填写版本号'); return }
    if (!addVersionFile) { setAddVersionError('请选择软件包文件'); return }
    setAddVersionError('')
    setVersionProgress(0)
    const formData = new FormData()
    formData.append('file', addVersionFile)
    formData.append('version', addVersionValue.trim())
    addVersionMutation.mutate({ id: versionsModal.item.id, formData })
    setAddVersionFile(null)
    setAddVersionValue('')
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
          {/* Cascading chip filter */}
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
            <div className="flex items-center gap-2">
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
            </div>
          </div>

          {query.isLoading ? <div className="text-muted-foreground">正在加载软件...</div> : null}
          {query.isError ? <div className="text-destructive">软件列表加载失败</div> : null}
          {!query.isLoading && !query.isError && query.data?.items.length === 0 ? <div className="text-muted-foreground">暂无软件</div> : null}
          {query.data && query.data.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>品牌</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>版本</TableHead>
                  <TableHead>大小</TableHead>
                  <TableHead>下载次数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>发布状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{displayName(item)}</TableCell>
                    <TableCell>{brandMap[item.brand] ?? item.brand}</TableCell>
                    <TableCell>{categoryMap[item.category] ?? item.category}</TableCell>
                    <TableCell>
                      <span>{item.latest_version ?? item.version ?? '-'}</span>
                      {(item.versions_count ?? 0) > 0 && (
                        <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                          +{item.versions_count}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{formatSize(item.latest_version_size)}</TableCell>
                    <TableCell>{item.download_count ?? 0}</TableCell>
                    <TableCell>{item.is_active === false ? '下架' : '上架'}</TableCell>
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
                <Button className="w-full whitespace-nowrap" disabled={addVersionMutation.isPending} onClick={handleAddVersion}>
                  {addVersionMutation.isPending ? (versionProgress < 100 ? '上传中...' : '处理中...') : '添加版本'}
                </Button>
              </div>
              {addVersionMutation.isPending ? (
                <div className="mt-2 space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all duration-150" style={{ width: `${versionProgress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{versionProgress < 100 ? `上传中 ${versionProgress}%` : '上传完成，正在处理...'}</p>
                </div>
              ) : null}
              {addVersionError ? <div className="mt-2 text-sm text-destructive">{addVersionError}</div> : null}
              {addVersionMutation.isError ? <div className="mt-2 text-sm text-destructive">版本上传失败，请检查版本号、文件格式和网络。</div> : null}
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
        open={deletingVersion !== null}
        title="确认删除版本？"
        description="删除后该版本将不可恢复。"
        onCancel={() => setDeletingVersion(null)}
        onConfirm={() => { if (deletingVersion) deleteVersionMutation.mutate({ id: deletingVersion.softwareId, versionId: deletingVersion.versionId }) }}
      />
    </div>
  )
}
