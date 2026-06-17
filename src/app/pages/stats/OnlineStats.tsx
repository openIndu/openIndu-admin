import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Button } from '../../components/ui/button'
import { Clock, MapPin, Monitor, Users } from 'lucide-react'

export function OnlineStats() {
  const [page, setPage] = useState(1)
  const pageSize = 10

  const onlineQuery = useQuery({ queryKey: ['stats', 'online'], queryFn: statsApi.online })
  const historyQuery = useQuery({
    queryKey: ['stats', 'login-history', page],
    queryFn: () => statsApi.loginHistory({ page, size: pageSize }),
  })

  const geoDistribution = onlineQuery.data?.geo_distribution ?? []
  const loginRecords = historyQuery.data?.items ?? []
  const loginTotal = historyQuery.data?.total ?? 0
  const totalPages = Math.ceil(loginTotal / pageSize)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">在线统计</h2>
        <p className="text-muted-foreground">当前在线用户、地域分布与登录历史。</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">当前在线</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {onlineQuery.isLoading ? '加载中' : onlineQuery.isError ? '--' : onlineQuery.data?.online_users ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">活跃地区</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {onlineQuery.isLoading ? '加载中' : onlineQuery.isError ? '--' : geoDistribution.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">今日登录</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {historyQuery.isLoading ? '加载中' : historyQuery.isError ? '--' : loginTotal}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">登录记录</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {historyQuery.isLoading ? '加载中' : historyQuery.isError ? '--' : loginTotal}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geo Distribution */}
      {geoDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              地域分布
            </CardTitle>
            <CardDescription>当前在线用户的地域分布情况。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {geoDistribution.map((geo) => (
                <div key={geo.name} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <span className="text-sm font-medium">{geo.name}</span>
                  <span className="text-sm text-muted-foreground">{geo.count} 人在线</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Login History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            登录历史
          </CardTitle>
          <CardDescription>最近用户登录记录。</CardDescription>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? <div className="text-muted-foreground">正在加载...</div> : null}
          {historyQuery.isError ? <div className="text-destructive">登录历史加载失败</div> : null}
          {!historyQuery.isLoading && !historyQuery.isError && loginRecords.length === 0 ? (
            <div className="text-muted-foreground">暂无登录记录</div>
          ) : null}
          {loginRecords.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>IP 地址</TableHead>
                    <TableHead>登录地区</TableHead>
                    <TableHead>登录时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginRecords.map((record: Record<string, unknown>, idx: number) => (
                    <TableRow key={(record.id as number) ?? idx}>
                      <TableCell className="font-medium">{String(record.username ?? '-')}</TableCell>
                      <TableCell>{String(record.ip ?? '-')}</TableCell>
                      <TableCell>{String(record.location ?? '-')}</TableCell>
                      <TableCell>
                        {record.login_time ? new Date(record.login_time as string).toLocaleString('zh-CN') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {page} / {totalPages} 页
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
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
