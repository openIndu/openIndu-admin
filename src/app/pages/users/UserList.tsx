import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { memberApplicationApi, userApi, type Role, type UserItem } from '@/api'
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

const roleOptions = [
  { value: 'user', label: '普通用户' },
  { value: 'member', label: '会员' },
  { value: 'admin', label: '管理员' },
]

const roleFilterOptions = [
  { value: '', label: '全部角色' },
  { value: 'user', label: '普通用户' },
  { value: 'member', label: '会员' },
  { value: 'admin', label: '管理员' },
]

const applyFilterOptions = [
  { value: '', label: '全部申请状态' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
  { value: 'none', label: '未申请' },
]

const applyStatusLabel: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
}

const applyStatusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'default',
  approved: 'secondary',
  rejected: 'destructive',
}

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

export function UserList() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [applyFilter, setApplyFilter] = useState('')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [pendingAction, setPendingAction] = useState<{
    type: 'blacklist' | 'unblacklist' | 'forceLogout' | 'delete'
    user: UserItem
  } | null>(null)
  const [pendingApprove, setPendingApprove] = useState<UserItem | null>(null)
  const [pendingReject, setPendingReject] = useState<UserItem | null>(null)

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

  const params = useMemo(() => ({
    page,
    size: 10,
    keyword: keyword || undefined,
    role: roleFilter || undefined,
    apply_status: applyFilter || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  }), [keyword, page, roleFilter, applyFilter, sortBy, sortOrder])

  const query = useQuery({
    queryKey: ['users', params],
    queryFn: () => userApi.list(params),
    refetchInterval: 30_000,
  })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] })

  const roleMutation = useMutation({ mutationFn: ({ id, role }: { id: number; role: Role }) => userApi.updateRole(id, role), onSuccess: invalidate })
  const blacklistMutation = useMutation({ mutationFn: userApi.blacklist, onSuccess: invalidate })
  const unblacklistMutation = useMutation({ mutationFn: userApi.unblacklist, onSuccess: invalidate })
  const forceLogoutMutation = useMutation({ mutationFn: userApi.forceLogout, onSuccess: invalidate })
  const deleteMutation = useMutation({ mutationFn: userApi.delete, onSuccess: invalidate })
  const approveMutation = useMutation({ mutationFn: (id: number) => memberApplicationApi.approve(id), onSuccess: invalidate })
  const rejectMutation = useMutation({ mutationFn: (id: number) => memberApplicationApi.reject(id), onSuccess: invalidate })

  const handleConfirm = () => {
    if (!pendingAction) return
    if (pendingAction.type === 'blacklist') blacklistMutation.mutate(pendingAction.user.id)
    if (pendingAction.type === 'unblacklist') unblacklistMutation.mutate(pendingAction.user.id)
    if (pendingAction.type === 'forceLogout') forceLogoutMutation.mutate(pendingAction.user.id)
    if (pendingAction.type === 'delete') deleteMutation.mutate(pendingAction.user.id)
    setPendingAction(null)
  }

  const resetPage = () => setPage(1)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>用户管理</CardTitle>
          <CardDescription>分页查看用户，调整角色、审批会员申请、拉黑或强制登出。</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 筛选栏 */}
          <div className="mb-4 flex flex-wrap gap-3">
            <Input
              placeholder="按手机号搜索"
              value={keyword}
              className="max-w-48"
              onChange={(e) => { setKeyword(e.target.value); resetPage() }}
            />
            <Select
              options={roleFilterOptions}
              value={roleFilter}
              className="w-36"
              onChange={(e) => { setRoleFilter(e.target.value); resetPage() }}
            />
            <Select
              options={applyFilterOptions}
              value={applyFilter}
              className="w-40"
              onChange={(e) => { setApplyFilter(e.target.value); resetPage() }}
            />
            <Button variant="outline" onClick={() => void query.refetch()}>刷新</Button>
          </div>

          {query.isLoading && !query.data ? <div className="text-muted-foreground py-4">正在加载用户...</div> : null}
          {query.isError && !query.data ? <div className="text-destructive py-4">用户列表加载失败</div> : null}
          {!query.isLoading && !query.isError && query.data?.items.length === 0 ? (
            <div className="text-muted-foreground py-4">暂无匹配用户</div>
          ) : null}

          {query.data && query.data.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>手机号</TableHead>
                  <TableHead>角色</TableHead>
                  <SortableHead
                    label="注册时间"
                    sortKey="created_at"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <TableHead>在线状态</TableHead>
                  <SortableHead
                    label="最后登录"
                    sortKey="last_login"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <TableHead>登录 IP</TableHead>
                  <TableHead>会员申请</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link className="text-primary hover:underline" to={`/users/${user.id}`}>{user.phone}</Link>
                    </TableCell>
                    <TableCell>
                      <Select
                        className="w-28"
                        options={roleOptions}
                        value={user.role}
                        onChange={(e) => roleMutation.mutate({ id: user.id, role: e.target.value as Role })}
                      />
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${user.online ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                        {user.online ? '在线' : '离线'}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(user.last_login)}</TableCell>
                    <TableCell>{user.login_ip ?? '-'}</TableCell>
                    <TableCell>
                      {user.member_apply_status ? (
                        <Badge variant={applyStatusVariant[user.member_apply_status] ?? 'outline'}>
                          {applyStatusLabel[user.member_apply_status] ?? user.member_apply_status}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        {user.member_apply_status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-700 border-green-200 hover:bg-green-50"
                              onClick={() => setPendingApprove(user)}
                            >
                              通过
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => setPendingReject(user)}
                            >
                              驳回
                            </Button>
                          </>
                        )}
                        {user.is_blacklisted
                          ? <Button size="sm" variant="outline" onClick={() => setPendingAction({ type: 'unblacklist', user })}>解除拉黑</Button>
                          : <Button size="sm" variant="destructive" onClick={() => setPendingAction({ type: 'blacklist', user })}>拉黑</Button>
                        }
                        <Button size="sm" variant="outline" onClick={() => setPendingAction({ type: 'forceLogout', user })}>强制登出</Button>
                        <Button size="sm" variant="destructive" onClick={() => setPendingAction({ type: 'delete', user })}>删除</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}

          {query.data ? (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>共 {query.data.total} 条，当前第 {query.data.page} 页</span>
              <div className="space-x-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                <Button size="sm" variant="outline" disabled={page * 10 >= query.data.total} onClick={() => setPage(page + 1)}>下一页</Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction?.type === 'delete' ? '确认删除用户？' : '确认执行用户操作？'}
        description={pendingAction
          ? pendingAction.type === 'delete'
            ? `目标用户：${pendingAction.user.phone}。删除为软删除：用户将从列表隐藏、无法登录，历史访问/审计记录保留。`
            : `目标用户：${pendingAction.user.phone}`
          : undefined}
        onCancel={() => setPendingAction(null)}
        onConfirm={handleConfirm}
      />

      <ConfirmDialog
        open={!!pendingApprove}
        title="确认通过会员申请"
        description={`通过后，用户 ${pendingApprove?.phone ?? ''} 将立即升级为会员。`}
        onConfirm={() => {
          if (pendingApprove) approveMutation.mutate(pendingApprove.id)
          setPendingApprove(null)
        }}
        onCancel={() => setPendingApprove(null)}
      />

      <ConfirmDialog
        open={!!pendingReject}
        title="确认驳回会员申请"
        description={`驳回后，用户 ${pendingReject?.phone ?? ''} 的申请将被拒绝，用户可重新申请。`}
        onConfirm={() => {
          if (pendingReject) rejectMutation.mutate(pendingReject.id)
          setPendingReject(null)
        }}
        onCancel={() => setPendingReject(null)}
      />
    </div>
  )
}
