import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { ShieldAlert } from 'lucide-react'

const actionOptions = [
  { value: '', label: '全部操作' },
  { value: 'role_change', label: '修改角色' },
  { value: 'blacklist', label: '拉黑用户' },
  { value: 'unblacklist', label: '解除拉黑' },
  { value: 'force_logout', label: '强制登出' },
]

export function AuditLogs() {
  const [page, setPage] = useState(1)
  const [adminKeyword, setAdminKeyword] = useState('')
  const [targetKeyword, setTargetKeyword] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [searchParams, setSearchParams] = useState({ adminKeyword: '', targetKeyword: '', action: '' })
  const pageSize = 10

  const query = useQuery({
    queryKey: ['audit-logs', page, searchParams],
    queryFn: () => adminApi.auditLogs({
      page,
      page_size: pageSize,
      admin_keyword: searchParams.adminKeyword || undefined,
      target_keyword: searchParams.targetKeyword || undefined,
      action: searchParams.action || undefined,
    }),
    retry: false,
  })

  const handleSearch = () => {
    setSearchParams({ adminKeyword, targetKeyword, action: actionFilter })
    setPage(1)
  }

  const handleClear = () => {
    setAdminKeyword(''); setTargetKeyword(''); setActionFilter('')
    setSearchParams({ adminKeyword: '', targetKeyword: '', action: '' })
    setPage(1)
  }

  if (query.isError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">审计日志</h2>
          <p className="text-muted-foreground">管理员操作记录与审计追踪。</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShieldAlert className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-destructive">审计日志加载失败，请检查后端服务。</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const data = (query.data as { items?: Record<string, unknown>[]; total?: number } | undefined) ?? {}
  const logs: Record<string, unknown>[] = data.items ?? []
  const total = data.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">审计日志</h2>
        <p className="text-muted-foreground">管理员操作记录与审计追踪。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            操作记录
          </CardTitle>
          <CardDescription>共 {total} 条操作记录。</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3">
            <Input
              placeholder="操作管理员手机号"
              value={adminKeyword}
              onChange={(e) => setAdminKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-44"
            />
            <Input
              placeholder="目标用户手机号"
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-44"
            />
            <Select
              options={actionOptions}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-36"
            />
            <Button variant="outline" onClick={handleSearch}>搜索</Button>
            {(searchParams.adminKeyword || searchParams.targetKeyword || searchParams.action) && (
              <Button variant="ghost" onClick={handleClear}>清除</Button>
            )}
            <Button variant="outline" className="ml-auto" onClick={() => void query.refetch()}>刷新</Button>
          </div>

          {query.isLoading ? <div className="text-muted-foreground py-4">正在加载...</div> : null}
          {!query.isLoading && logs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">暂无审计记录</div>
          ) : null}

          {logs.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>操作管理员</TableHead>
                    <TableHead>目标用户</TableHead>
                    <TableHead>操作类型</TableHead>
                    <TableHead>详情</TableHead>
                    <TableHead>操作时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, idx) => (
                    <TableRow key={(log.id as number) ?? idx}>
                      <TableCell className="font-medium">
                        {String(log.admin_username ?? (log.admin_id ? `ID:${log.admin_id}` : '-'))}
                      </TableCell>
                      <TableCell>
                        {String(log.target_user ?? (log.target_user_id ? `ID:${log.target_user_id}` : '-'))}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                          {String(log.action ?? '-')}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={String(log.detail ?? '')}>
                        {String(log.detail ?? '-')}
                      </TableCell>
                      <TableCell>
                        {log.created_at ? new Date(log.created_at as string).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '-'}
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
