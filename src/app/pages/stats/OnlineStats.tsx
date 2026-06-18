import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/api'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Clock } from 'lucide-react'

const statusOptions = [
  { value: '', label: '全部' },
  { value: 'online', label: '在线' },
  { value: 'offline', label: '已离线' },
]

export function OnlineStats() {
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchParams, setSearchParams] = useState({ keyword: '', status: '' })
  const pageSize = 20

  const query = useQuery({
    queryKey: ['stats', 'login-history', page, searchParams],
    queryFn: () =>
      statsApi.loginHistory({
        page,
        size: pageSize,
        keyword: searchParams.keyword || undefined,
        status: searchParams.status || undefined,
      }),
  })

  const records = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  const handleSearch = () => {
    setSearchParams({ keyword, status: statusFilter })
    setPage(1)
  }

  const handleClear = () => {
    setKeyword('')
    setStatusFilter('')
    setSearchParams({ keyword: '', status: '' })
    setPage(1)
  }

  const hasFilter = searchParams.keyword || searchParams.status

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">登录日志</h2>
        <p className="text-muted-foreground">用户登录会话记录，支持按手机号和状态筛选。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            登录记录
          </CardTitle>
          <CardDescription>共 {total} 条登录记录。</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3">
            <Input
              placeholder="按手机号搜索"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="max-w-xs"
            />
            {/* Status filter tabs */}
            <div className="flex rounded-md border overflow-hidden">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    statusFilter === opt.value
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

          {query.isLoading ? <div className="text-muted-foreground py-4">正在加载...</div> : null}
          {query.isError ? <div className="text-destructive py-4">登录日志加载失败</div> : null}
          {!query.isLoading && !query.isError && records.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">暂无登录记录</div>
          ) : null}

          {records.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>手机号</TableHead>
                    <TableHead>IP 地址</TableHead>
                    <TableHead>登录地区</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record: Record<string, unknown>, idx: number) => (
                    <TableRow key={(record.id as number) ?? idx}>
                      <TableCell className="font-medium">
                        {String(record.username ?? record.user_id ?? '-')}
                      </TableCell>
                      <TableCell>{String(record.ip ?? record.ip_address ?? '-')}</TableCell>
                      <TableCell>{String(record.location ?? record.geo_location ?? '-')}</TableCell>
                      <TableCell>
                        <Badge variant={record.is_active ? 'success' : 'secondary'}>
                          {record.is_active ? '在线' : '已离线'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.login_time ?? record.last_active_at
                          ? new Date(
                              (record.login_time ?? record.last_active_at) as string,
                            ).toLocaleString('zh-CN')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {page} / {totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
