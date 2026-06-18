import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userApi, type Role, type UserItem } from '@/api'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ConfirmDialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'

const roleOptions = [
  { value: 'user', label: '普通用户' },
  { value: 'member', label: '会员' },
  { value: 'admin', label: '管理员' },
]

const roleLabels: Record<Role, string> = {
  user: '普通用户',
  member: '会员',
  admin: '管理员',
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function UserList() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [pendingAction, setPendingAction] = useState<{ type: 'blacklist' | 'unblacklist' | 'forceLogout'; user: UserItem } | null>(null)
  const params = useMemo(() => ({ page, size: 10, keyword: keyword || undefined }), [keyword, page])
  const query = useQuery({ queryKey: ['users', params], queryFn: () => userApi.list(params) })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] })
  const roleMutation = useMutation({ mutationFn: ({ id, role }: { id: number; role: Role }) => userApi.updateRole(id, role), onSuccess: invalidate })
  const blacklistMutation = useMutation({ mutationFn: userApi.blacklist, onSuccess: invalidate })
  const unblacklistMutation = useMutation({ mutationFn: userApi.unblacklist, onSuccess: invalidate })
  const forceLogoutMutation = useMutation({ mutationFn: userApi.forceLogout, onSuccess: invalidate })

  const handleConfirm = () => {
    if (!pendingAction) return
    if (pendingAction.type === 'blacklist') blacklistMutation.mutate(pendingAction.user.id)
    if (pendingAction.type === 'unblacklist') unblacklistMutation.mutate(pendingAction.user.id)
    if (pendingAction.type === 'forceLogout') forceLogoutMutation.mutate(pendingAction.user.id)
    setPendingAction(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>用户管理</CardTitle>
          <CardDescription>分页查看用户，调整角色、拉黑、解除拉黑或强制登出。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-3">
            <Input placeholder="按手机号搜索" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1) }} />
            <Button variant="outline" onClick={() => void query.refetch()}>刷新</Button>
          </div>
          {query.isLoading ? <div className="text-muted-foreground">正在加载用户...</div> : null}
          {query.isError ? <div className="text-destructive">用户列表加载失败</div> : null}
          {!query.isLoading && !query.isError && query.data?.items.length === 0 ? <div className="text-muted-foreground">暂无用户</div> : null}
          {query.data && query.data.items.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>手机号</TableHead><TableHead>角色</TableHead><TableHead>注册时间</TableHead><TableHead>在线状态</TableHead><TableHead>最后登录</TableHead><TableHead>登录 IP</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
              <TableBody>
                {query.data.items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell><Link className="text-primary hover:underline" to={`/users/${user.id}`}>{user.phone}</Link></TableCell>
                    <TableCell><Badge variant={user.role === 'admin' ? 'default' : user.role === 'member' ? 'secondary' : 'outline'}>{roleLabels[user.role]}</Badge></TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${user.online ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />{user.online ? '在线' : '离线'}</span></TableCell>
                    <TableCell>{user.last_login ?? '-'}</TableCell>
                    <TableCell>{user.login_ip ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Select className="w-28" options={roleOptions} value={user.role} onChange={(event) => roleMutation.mutate({ id: user.id, role: event.target.value as Role })} />
                        {user.is_blacklisted ? <Button size="sm" variant="outline" onClick={() => setPendingAction({ type: 'unblacklist', user })}>解除拉黑</Button> : <Button size="sm" variant="destructive" onClick={() => setPendingAction({ type: 'blacklist', user })}>拉黑</Button>}
                        <Button size="sm" variant="outline" onClick={() => setPendingAction({ type: 'forceLogout', user })}>强制登出</Button>
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
              <div className="space-x-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={page * 10 >= query.data.total} onClick={() => setPage(page + 1)}>下一页</Button></div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <ConfirmDialog open={pendingAction !== null} title="确认执行用户操作？" description={pendingAction ? `目标用户：${pendingAction.user.phone}` : undefined} onCancel={() => setPendingAction(null)} onConfirm={handleConfirm} />
    </div>
  )
}
