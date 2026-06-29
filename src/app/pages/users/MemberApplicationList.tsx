import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { memberApplicationApi, type MemberApplicationItem } from '@/api'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ConfirmDialog } from '../../components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusLabel: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
}

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  pending: 'default',
  approved: 'secondary',
}

export function MemberApplicationList() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pendingApprove, setPendingApprove] = useState<MemberApplicationItem | null>(null)
  const size = 20

  const query = useQuery({
    queryKey: ['member-applications', page],
    queryFn: () => memberApplicationApi.list({ page, size }),
    refetchInterval: 30_000,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['member-applications'] })
  const approveMutation = useMutation({
    mutationFn: (id: number) => memberApplicationApi.approve(id),
    onSuccess: invalidate,
  })

  const data = query.data
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / size)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>会员申请</CardTitle>
          <CardDescription>审核用户提交的会员升级申请，通过后自动将角色改为会员。</CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">加载中…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>手机号</TableHead>
                  <TableHead>昵称</TableHead>
                  <TableHead>当前角色</TableHead>
                  <TableHead>留言</TableHead>
                  <TableHead>申请时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      暂无申请记录
                    </TableCell>
                  </TableRow>
                )}
                {(data?.items ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.phone ?? '-'}</TableCell>
                    <TableCell>{item.nickname ?? '-'}</TableCell>
                    <TableCell>{item.current_role ?? '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {item.note || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(item.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[item.status] ?? 'outline'}>
                        {statusLabel[item.status] ?? item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-700 border-green-200 hover:bg-green-50"
                          onClick={() => setPendingApprove(item)}
                        >
                          通过
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>共 {total} 条</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  上一页
                </Button>
                <span className="px-2 py-1">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!pendingApprove}
        title="确认通过申请"
        description={`通过后，用户 ${pendingApprove?.phone ?? ''} 将立即升级为会员。`}
        onConfirm={() => {
          if (pendingApprove) approveMutation.mutate(pendingApprove.id)
          setPendingApprove(null)
        }}
        onCancel={() => setPendingApprove(null)}
      />
    </div>
  )
}
