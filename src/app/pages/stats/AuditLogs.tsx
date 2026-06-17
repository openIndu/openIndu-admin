import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Button } from '../../components/ui/button'
import { ShieldAlert, Search } from 'lucide-react'

export function AuditLogs() {
  const [page, setPage] = useState(1)
  const pageSize = 15

  const query = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: async () => {
      const res = await api.get('/admin/audit-logs', { params: { page, page_size: pageSize } })
      const data = res.data.data ?? res.data
      return data
    },
    retry: false,
  })

  // Detect if the endpoint doesn't exist yet
  if (query.isError) {
    const err = query.error as { response?: { status?: number } }
    const isNotFound = err?.response?.status === 404

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">审计日志</h2>
          <p className="text-muted-foreground">管理员操作记录与审计追踪。</p>
        </div>
        {isNotFound ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ShieldAlert className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">功能即将上线</h3>
              <p className="max-w-md text-center text-muted-foreground">
                审计日志功能正在开发中。后端需要提供{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm">GET /api/admin/audit-logs</code>{' '}
                接口，查询 <code className="rounded bg-muted px-1.5 py-0.5 text-sm">admin_audit_logs</code> 表数据。
              </p>
              <div className="mt-4 rounded-lg bg-muted p-4 text-left font-mono text-sm">
                <p className="mb-1 font-semibold">期望返回字段：</p>
                <p>id, admin_username, target_user, action, detail, ip, created_at</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-destructive">审计日志加载失败，请检查后端服务。</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const data = (query.data as { items?: Record<string, unknown>[]; total?: number; records?: Record<string, unknown>[] }) ?? {}
  const logs: Record<string, unknown>[] = data.items ?? data.records ?? []
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
            <Search className="h-5 w-5" />
            操作记录
          </CardTitle>
          <CardDescription>所有管理员的关键操作记录。</CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading ? <div className="text-muted-foreground">正在加载...</div> : null}
          {logs.length === 0 && !query.isLoading ? (
            <div className="text-muted-foreground">暂无审计记录</div>
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
                        {log.created_at ? new Date(log.created_at as string).toLocaleString('zh-CN') : '-'}
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
