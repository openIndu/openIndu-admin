import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/api'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Clock, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

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

const authedOptions = [
  { value: '', label: '全部' },
  { value: 'yes', label: '已登录' },
  { value: 'no', label: '匿名' },
]

export function OnlineStats() {
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [authedFilter, setAuthedFilter] = useState('')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchParams, setSearchParams] = useState({ keyword: '', authed: '' })
  const pageSize = 10

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

  const query = useQuery({
    queryKey: ['stats', 'visit-logs', page, searchParams, sortBy, sortOrder],
    queryFn: () =>
      statsApi.visitLogs({
        page,
        size: pageSize,
        keyword: searchParams.keyword || undefined,
        authed: searchParams.authed || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
  })

  const records = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  const handleSearch = () => {
    setSearchParams({ keyword, authed: authedFilter })
    setPage(1)
  }

  const handleClear = () => {
    setKeyword('')
    setAuthedFilter('')
    setSearchParams({ keyword: '', authed: '' })
    setPage(1)
  }

  const hasFilter = searchParams.keyword || searchParams.authed

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">访问日志</h2>
        <p className="text-muted-foreground">网站访问记录（匿名 + 登录），支持按手机号 / IP 搜索。本地开发访问默认不展示。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            访问记录
          </CardTitle>
          <CardDescription>共 {total} 条访问记录。</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3">
            <Input
              placeholder="按手机号或 IP 搜索"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="max-w-xs"
            />
            {/* Authenticated filter tabs */}
            <div className="flex rounded-md border overflow-hidden">
              {authedOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAuthedFilter(opt.value)}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    authedFilter === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={handleSearch}>
              搜索
            </Button>
            {hasFilter && (
              <Button variant="ghost" onClick={handleClear}>
                清除
              </Button>
            )}
            <Button variant="outline" className="ml-auto" onClick={() => void query.refetch()}>
              刷新
            </Button>
          </div>

          {query.isLoading && !query.data ? <div className="text-muted-foreground py-4">正在加载...</div> : null}
          {query.isError && !query.data ? <div className="text-destructive py-4">访问日志加载失败</div> : null}
          {!query.isLoading && !query.isError && records.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">暂无访问记录</div>
          ) : null}

          {records.length > 0 && (
            <>
              <Table className="[&_td]:whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>IP 地址</TableHead>
                    <TableHead>访问地区</TableHead>
                    <TableHead>访问页面</TableHead>
                    <TableHead>是否登录</TableHead>
                    <SortableHead
                      label="时间"
                      sortKey="created_at"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record: Record<string, unknown>, idx: number) => (
                    <TableRow key={(record.id as number) ?? idx}>
                      <TableCell className="font-medium">
                        {record.username ? String(record.username) : '匿名'}
                      </TableCell>
                      <TableCell>{String(record.ip ?? record.ip_address ?? '-')}</TableCell>
                      <TableCell>{String(record.location ?? record.geo_location ?? '-')}</TableCell>
                      <TableCell className="max-w-[220px] truncate" title={String(record.path ?? '')}>
                        {String(record.path ?? '-')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.is_authenticated ? 'success' : 'secondary'}>
                          {record.is_authenticated ? '已登录' : '匿名'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.time
                          ? new Date(record.time as string).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>共 {total} 条，第 {page} / {Math.max(1, totalPages)} 页</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>上一页</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>下一页</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
