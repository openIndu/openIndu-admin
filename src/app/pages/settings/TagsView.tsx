import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tagsApi, type ResourceTag } from '@/api'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ConfirmDialog } from '../../components/ui/dialog'
import { DropdownMenu, DropdownMenuItem } from '../../components/ui/dropdown-menu'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Sheet, SheetContent } from '../../components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Tabs } from '../../components/ui/tabs'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'

const PAGE_SIZE_OPTIONS = [10, 20, 50]

// ─── Clickable sortable column header ─────────────────────────────────────────
function SortableHead({ label, sortKey, currentSortBy, currentSortOrder, onSort, className }: {
  label: string
  sortKey: string
  currentSortBy: string
  currentSortOrder: 'asc' | 'desc'
  onSort: (key: string) => void
  className?: string
}) {
  const isActive = currentSortBy === sortKey
  return (
    <TableHead className={`cursor-pointer select-none hover:bg-muted/50 ${className || ''}`} onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1 whitespace-nowrap">
        {label}
        {isActive
          ? (currentSortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)
          : <ChevronsUpDown className="h-4 w-4 text-muted-foreground/40" />}
      </div>
    </TableHead>
  )
}

// ─── Filterable column header with dropdown ───────────────────────────────────
function FilterableHead({ label, options, value, onChange, align = 'right' }: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  align?: 'left' | 'right'
}) {
  const isActive = value !== ''
  const selectedLabel = options.find((o) => o.value === value)?.label
  return (
    <TableHead className="cursor-pointer select-none hover:bg-muted/50">
      <DropdownMenu
        align={align}
        trigger={
          <div className={`flex items-center gap-1 whitespace-nowrap ${isActive ? 'text-primary font-semibold' : ''}`}>
            {isActive ? selectedLabel : label}
            <svg className="h-3.5 w-3.5 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>
        }
      >
        {(close) => options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => { onChange(opt.value); close() }}
            className={value === opt.value ? 'bg-accent font-semibold' : ''}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenu>
    </TableHead>
  )
}

// ─── Tag form modal (create / edit for flat types) ───────────────────────────
function TagModal({ mode, tag, type, onClose, onSuccess }: {
  mode: 'create' | 'edit'
  tag?: ResourceTag
  type: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [value, setValue] = useState(tag?.value ?? '')
  const [label, setLabel] = useState(tag?.label_zh ?? '')
  const [sort, setSort] = useState(tag?.sort_order ?? 0)
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: tagsApi.create,
    onSuccess: () => { onSuccess(); onClose() },
    onError: (err: { response?: { data?: { message?: string } } }) => setError(err?.response?.data?.message ?? '创建失败'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof tagsApi.update>[1] }) => tagsApi.update(id, data),
    onSuccess: () => { onSuccess(); onClose() },
    onError: (err: { response?: { data?: { message?: string } } }) => setError(err?.response?.data?.message ?? '更新失败'),
  })
  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = () => {
    if (!label.trim()) { setError('中文名不能为空'); return }
    if (mode === 'create' && !value.trim()) { setError('标识不能为空'); return }
    setError('')
    if (mode === 'create') {
      createMutation.mutate({ type, value: value.trim(), label_zh: label.trim(), sort_order: sort })
    } else if (tag) {
      updateMutation.mutate({ id: tag.id, data: { label_zh: label.trim(), sort_order: sort } })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-5 shadow-lg">
        <h3 className="mb-3 text-lg font-semibold">{mode === 'create' ? '新增标签' : '编辑标签'}</h3>
        <div className="space-y-2.5">
          {mode === 'create' ? (
            <label className="block space-y-1 text-sm">
              <span>标识（英文 slug）</span>
              <Input placeholder="如 abb" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
            </label>
          ) : (
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">标识：</span>
              <span className="font-mono">{tag?.value}</span>
            </div>
          )}
          <label className="block space-y-1 text-sm">
            <span>中文名</span>
            <Input placeholder="如 ABB" value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>排序（数字越小越靠前）</span>
            <Input type="number" value={sort} onChange={(e) => setSort(Number(e.target.value))} />
          </label>
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button disabled={isPending} onClick={handleSubmit}>{isPending ? '提交中...' : '确定'}</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Series form modal (create / edit) ───────────────────────────────────────
function SeriesModal({ mode, tag, seriesType, brands, categories, onClose, onSuccess }: {
  mode: 'create' | 'edit'
  tag?: ResourceTag
  seriesType: string
  brands: ResourceTag[]
  categories: ResourceTag[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [value, setValue] = useState(tag?.value ?? '')
  const [label, setLabel] = useState(tag?.label_zh ?? '')
  const [sort, setSort] = useState(tag?.sort_order ?? 0)
  const [parent, setParent] = useState(tag?.parent_value ?? '')
  const [brand, setBrand] = useState(tag?.brand_value ?? '')
  const [error, setError] = useState('')

  const categoryOptions = useMemo(() => categories.filter((c) => c.is_active).map((c) => ({ value: c.value, label: c.label_zh })), [categories])
  const brandOptions = useMemo(() => brands.filter((b) => b.is_active).map((b) => ({ value: b.value, label: b.label_zh })), [brands])

  const createMutation = useMutation({
    mutationFn: tagsApi.create,
    onSuccess: () => { onSuccess(); onClose() },
    onError: (err: { response?: { data?: { message?: string } } }) => setError(err?.response?.data?.message ?? '创建失败'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof tagsApi.update>[1] }) => tagsApi.update(id, data),
    onSuccess: () => { onSuccess(); onClose() },
    onError: (err: { response?: { data?: { message?: string } } }) => setError(err?.response?.data?.message ?? '更新失败'),
  })
  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = () => {
    if (mode === 'create' && !brand) { setError('请选择品牌'); return }
    if (mode === 'create' && !parent) { setError('请选择所属类型'); return }
    if (!label.trim()) { setError('中文名不能为空'); return }
    if (mode === 'create' && !value.trim()) { setError('标识不能为空'); return }
    setError('')
    if (mode === 'create') {
      createMutation.mutate({ type: seriesType, value: value.trim(), label_zh: label.trim(), parent_value: parent, brand_value: brand || undefined, sort_order: sort })
    } else if (tag) {
      updateMutation.mutate({ id: tag.id, data: { label_zh: label.trim(), sort_order: sort } })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-5 shadow-lg">
        <h3 className="mb-3 text-lg font-semibold">{mode === 'create' ? '新增系列' : '编辑系列'}</h3>
        <div className="space-y-2.5">
          {mode === 'create' ? (
            <>
              <label className="block space-y-1 text-sm">
                <span>品牌 <span className="text-destructive">*</span></span>
                <Select options={brandOptions} placeholder="请选择品牌" value={brand} onChange={(e) => setBrand(e.target.value)} autoFocus />
              </label>
              <label className="block space-y-1 text-sm">
                <span>所属类型 <span className="text-destructive">*</span></span>
                <Select options={categoryOptions} placeholder="请选择类型" value={parent} onChange={(e) => setParent(e.target.value)} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>标识（英文 slug）</span>
                <Input placeholder="如 fx" value={value} onChange={(e) => setValue(e.target.value)} />
              </label>
            </>
          ) : (
            <div className="space-y-1 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <div><span>标识：</span><span className="font-mono text-foreground">{tag?.value}</span></div>
              <div><span>所属分类：</span><span className="text-foreground">{tag?.parent_value ?? '-'}</span></div>
            </div>
          )}
          <label className="block space-y-1 text-sm">
            <span>中文名</span>
            <Input placeholder="如 FX系列" value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>排序（数字越小越靠前）</span>
            <Input type="number" value={sort} onChange={(e) => setSort(Number(e.target.value))} />
          </label>
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button disabled={isPending} onClick={handleSubmit}>{isPending ? '提交中...' : '确定'}</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Flat tag panel (doc_brand / sw_brand / doc_category / sw_category) ──────
function FlatTagPanel({ type }: { type: string }) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tags', type] })

  const { data: tags = [], isLoading } = useQuery({ queryKey: ['tags', type], queryFn: () => tagsApi.list(type), staleTime: 0 })

  const [sortBy, setSortBy] = useState<'sort_order' | 'usage_count'>('sort_order')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key as 'sort_order' | 'usage_count')
      setSortOrder(key === 'usage_count' ? 'desc' : 'asc')
    }
  }

  const sortedTags = useMemo(() => {
    const copy = [...tags]
    copy.sort((a, b) => {
      const av = sortBy === 'sort_order' ? a.sort_order : (a.usage_count ?? 0)
      const bv = sortBy === 'sort_order' ? b.sort_order : (b.usage_count ?? 0)
      const diff = sortOrder === 'asc' ? av - bv : bv - av
      return diff || a.sort_order - b.sort_order || a.id - b.id
    })
    return copy
  }, [tags, sortBy, sortOrder])

  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const filteredSorted = useMemo(() => {
    if (!filterStatus) return sortedTags
    return sortedTags.filter((t) => filterStatus === 'active' ? t.is_active : !t.is_active)
  }, [sortedTags, filterStatus])
  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize))
  const pagedTags = useMemo(() => filteredSorted.slice((page - 1) * pageSize, page * pageSize), [filteredSorted, page, pageSize])

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; tag?: ResourceTag } | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof tagsApi.update>[1] }) => tagsApi.update(id, data),
    onSuccess: () => invalidate(),
  })
  const removeMutation = useMutation({
    mutationFn: tagsApi.remove,
    onSuccess: () => { invalidate(); setDeletingId(null) },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setDeleteError(err?.response?.data?.message ?? '删除失败')
      setDeletingId(null)
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setModal({ mode: 'create' })}>新增标签</Button>
      </div>

      {isLoading ? <div className="text-sm text-muted-foreground">正在加载...</div> : null}
      {!isLoading && sortedTags.length === 0 ? <div className="text-sm text-muted-foreground">暂无标签</div> : null}

      {pagedTags.length > 0 ? (
        <Table className="[&_td]:whitespace-nowrap">
          <TableHeader>
            <TableRow>
              <SortableHead label="排序" sortKey="sort_order" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="w-16" />
              <TableHead>标识（value）</TableHead>
              <TableHead>中文名</TableHead>
              <SortableHead label="使用" sortKey="usage_count" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="w-20" />
              <FilterableHead
                label="状态"
                options={[
                  { value: '', label: '全部状态' },
                  { value: 'active', label: '启用' },
                  { value: 'inactive', label: '停用' },
                ]}
                value={filterStatus}
                onChange={(v) => { setFilterStatus(v); setPage(1) }}
              />
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedTags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell className="text-sm text-muted-foreground">{tag.sort_order}</TableCell>
                <TableCell className="font-mono text-sm">{tag.value}</TableCell>
                <TableCell>{tag.label_zh}</TableCell>
                <TableCell>
                  <span className="text-sm tabular-nums">{tag.usage_count ?? 0}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={tag.is_active ? 'success' : 'secondary'}>{tag.is_active ? '启用' : '停用'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => setModal({ mode: 'edit', tag })}>编辑</Button>
                    <Button size="sm" variant="outline" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: tag.id, data: { is_active: !tag.is_active } })}>
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

      <div className="flex items-center justify-end gap-3 text-sm text-muted-foreground">
        <span>共 {filteredSorted.length} 条</span>
        <Select
          className="w-24"
          options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: `${n} 条/页` }))}
          value={String(pageSize)}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
        />
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
        <span>{page} / {totalPages}</span>
        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
      </div>

      {modal ? (
        <TagModal mode={modal.mode} tag={modal.tag} type={type} onClose={() => setModal(null)} onSuccess={() => { invalidate(); setPage(1) }} />
      ) : null}

      <ConfirmDialog
        open={deletingId !== null}
        title="确认删除标签？"
        description="如有文档或软件仍在使用该标签，删除将被拒绝。"
        onCancel={() => setDeletingId(null)}
        onConfirm={() => { if (deletingId !== null) removeMutation.mutate(deletingId) }}
      />

      <Sheet open={deleteError !== null} onOpenChange={(open) => { if (!open) setDeleteError(null) }} autoClose={3000}>
        <SheetContent side="top" bare className="pt-8 [animation:sheetSlideInTop_0.3s_ease]">
          <p className="mx-auto w-fit text-lg font-semibold text-red-600 bg-red-50 px-4 py-2 rounded">{deleteError}</p>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Series panel (doc_series only) ───────────────────────────────────────────
function SeriesPanel({ seriesType, categoryType, categoryLabel, brandType }: {
  seriesType: string
  categoryType: string
  categoryLabel: string
  brandType: string
}) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tags', seriesType] })

  const { data: categories = [] } = useQuery({ queryKey: ['tags', categoryType], queryFn: () => tagsApi.list(categoryType), staleTime: 0 })
  const { data: brands = [] } = useQuery({ queryKey: ['tags', brandType], queryFn: () => tagsApi.list(brandType), staleTime: 0 })
  const { data: allSeries = [], isLoading } = useQuery({ queryKey: ['tags', seriesType], queryFn: () => tagsApi.list(seriesType), staleTime: 0 })

  const [filterBrand, setFilterBrand] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortBy, setSortBy] = useState<'sort_order' | 'usage_count'>('sort_order')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key as 'sort_order' | 'usage_count')
      setSortOrder(key === 'usage_count' ? 'desc' : 'asc')
    }
  }

  const filteredSorted = useMemo(() => {
    let filtered = allSeries
    if (filterBrand) filtered = filtered.filter((t) => t.brand_value === filterBrand)
    if (filterCategory) filtered = filtered.filter((t) => t.parent_value === filterCategory)
    if (filterStatus) filtered = filtered.filter((t) => filterStatus === 'active' ? t.is_active : !t.is_active)

    const copy = [...filtered]
    copy.sort((a, b) => {
      const av = sortBy === 'sort_order' ? a.sort_order : (a.usage_count ?? 0)
      const bv = sortBy === 'sort_order' ? b.sort_order : (b.usage_count ?? 0)
      const diff = sortOrder === 'asc' ? av - bv : bv - av
      return diff || a.sort_order - b.sort_order || a.id - b.id
    })
    return copy
  }, [allSeries, filterBrand, filterCategory, filterStatus, sortBy, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize))
  const pagedSeries = useMemo(() => filteredSorted.slice((page - 1) * pageSize, page * pageSize), [filteredSorted, page, pageSize])

  const categoryOptions = useMemo(() => categories.filter((c) => c.is_active).map((c) => ({ value: c.value, label: c.label_zh })), [categories])
  const brandOptions = useMemo(() => brands.filter((b) => b.is_active).map((b) => ({ value: b.value, label: b.label_zh })), [brands])
  const brandMap = useMemo(() => Object.fromEntries(brandOptions.map((b) => [b.value, b.label])), [brandOptions])
  const categoryMap = useMemo(() => Object.fromEntries(categoryOptions.map((c) => [c.value, c.label])), [categoryOptions])

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; tag?: ResourceTag } | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof tagsApi.update>[1] }) => tagsApi.update(id, data),
    onSuccess: () => invalidate(),
  })
  const removeMutation = useMutation({
    mutationFn: tagsApi.remove,
    onSuccess: () => { invalidate(); setDeletingId(null) },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setDeleteError(err?.response?.data?.message ?? '删除失败')
      setDeletingId(null)
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setModal({ mode: 'create' })}>新增系列</Button>
      </div>

      {isLoading ? <div className="text-sm text-muted-foreground">正在加载...</div> : null}
      {!isLoading && filteredSorted.length === 0 ? <div className="text-sm text-muted-foreground">暂无系列标签</div> : null}

      {pagedSeries.length > 0 ? (
        <Table className="[&_td]:whitespace-nowrap">
          <TableHeader>
            <TableRow>
              <SortableHead label="排序" sortKey="sort_order" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="w-16" />
              <FilterableHead
                label="品牌"
                options={[{ value: '', label: '全部品牌' }, ...brandOptions]}
                value={filterBrand}
                onChange={(v) => { setFilterBrand(v); setFilterCategory(''); setPage(1) }}
                align="left"
              />
              <FilterableHead
                label={categoryLabel}
                options={[{ value: '', label: `全部${categoryLabel}` }, ...categoryOptions]}
                value={filterCategory}
                onChange={(v) => { setFilterCategory(v); setPage(1) }}
              />
              <TableHead>标识（value）</TableHead>
              <TableHead>中文名</TableHead>
              <SortableHead label="使用" sortKey="usage_count" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="w-20" />
              <FilterableHead
                label="状态"
                options={[
                  { value: '', label: '全部状态' },
                  { value: 'active', label: '启用' },
                  { value: 'inactive', label: '停用' },
                ]}
                value={filterStatus}
                onChange={(v) => { setFilterStatus(v); setPage(1) }}
              />
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedSeries.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell className="text-sm text-muted-foreground">{tag.sort_order}</TableCell>
                <TableCell className="text-sm">{tag.brand_value ? (brandMap[tag.brand_value] ?? tag.brand_value) : '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{categoryMap[tag.parent_value ?? ''] ?? tag.parent_value ?? '-'}</TableCell>
                <TableCell className="font-mono text-sm">{tag.value}</TableCell>
                <TableCell>{tag.label_zh}</TableCell>
                <TableCell>
                  <span className="text-sm tabular-nums">{tag.usage_count ?? 0}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={tag.is_active ? 'success' : 'secondary'}>{tag.is_active ? '启用' : '停用'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => setModal({ mode: 'edit', tag })}>编辑</Button>
                    <Button size="sm" variant="outline" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: tag.id, data: { is_active: !tag.is_active } })}>
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

      <div className="flex items-center justify-end gap-3 text-sm text-muted-foreground">
        <span>共 {filteredSorted.length} 条</span>
        <Select
          className="w-24"
          options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: `${n} 条/页` }))}
          value={String(pageSize)}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
        />
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
        <span>{page} / {totalPages}</span>
        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
      </div>

      {modal ? (
        <SeriesModal
          mode={modal.mode}
          tag={modal.tag}
          seriesType={seriesType}
          brands={brands}
          categories={categories}
          onClose={() => setModal(null)}
          onSuccess={() => { invalidate(); setPage(1) }}
        />
      ) : null}

      <ConfirmDialog
        open={deletingId !== null}
        title="确认删除系列？"
        description="如有文档仍在使用该系列，删除将被拒绝。"
        onCancel={() => setDeletingId(null)}
        onConfirm={() => { if (deletingId !== null) removeMutation.mutate(deletingId) }}
      />

      <Sheet open={deleteError !== null} onOpenChange={(open) => { if (!open) setDeleteError(null) }} autoClose={3000}>
        <SheetContent side="top" bare className="pt-8 [animation:sheetSlideInTop_0.3s_ease]">
          <p className="mx-auto w-fit text-lg font-semibold text-red-600 bg-red-50 px-4 py-2 rounded">{deleteError}</p>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Root view ────────────────────────────────────────────────────────────────
export function TagsView() {
  const tabs = [
    { value: 'doc_brand', label: '文档品牌', content: <FlatTagPanel type="doc_brand" /> },
    { value: 'doc_category', label: '文档分类', content: <FlatTagPanel type="doc_category" /> },
    { value: 'doc_series', label: '文档系列', content: <SeriesPanel seriesType="doc_series" categoryType="doc_category" categoryLabel="文档分类" brandType="doc_brand" /> },
    { value: 'sw_brand', label: '软件品牌', content: <FlatTagPanel type="sw_brand" /> },
    { value: 'sw_category', label: '软件分类', content: <FlatTagPanel type="sw_category" /> },
    // 软件没有系列概念，故不提供软件系列管理。
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>品牌与分类管理</CardTitle>
        <CardDescription>维护文档/软件的品牌、分类和系列标签，变更后立即生效于上传表单和筛选器。</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="doc_brand" items={tabs} />
      </CardContent>
    </Card>
  )
}
