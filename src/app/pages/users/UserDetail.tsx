import { useState } from 'react'
import { useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userApi, type Role } from '@/api'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ConfirmDialog } from '../../components/ui/dialog'
import { Select } from '../../components/ui/select'

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

export function UserDetail() {
  const { id } = useParams()
  const userId = Number(id)
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['users', 'detail-source'], queryFn: () => userApi.list({ page: 1, size: 100 }), select: (data) => data.items.find((item) => item.id === userId), enabled: Number.isFinite(userId) })
  const [action, setAction] = useState<'blacklist' | 'unblacklist' | 'forceLogout' | null>(null)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] })
  const roleMutation = useMutation({ mutationFn: (role: Role) => userApi.updateRole(userId, role), onSuccess: invalidate })
  const blacklistMutation = useMutation({ mutationFn: () => userApi.blacklist(userId), onSuccess: invalidate })
  const unblacklistMutation = useMutation({ mutationFn: () => userApi.unblacklist(userId), onSuccess: invalidate })
  const forceLogoutMutation = useMutation({ mutationFn: () => userApi.forceLogout(userId), onSuccess: invalidate })

  const handleConfirm = () => {
    if (action === 'blacklist') blacklistMutation.mutate()
    if (action === 'unblacklist') unblacklistMutation.mutate()
    if (action === 'forceLogout') forceLogoutMutation.mutate()
    setAction(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>用户详情</CardTitle>
        <CardDescription>查看用户信息并执行角色调整、拉黑或强制登出。</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading ? <div className="text-muted-foreground">正在加载用户详情...</div> : null}
        {query.isError ? <div className="text-destructive">用户详情加载失败</div> : null}
        {!query.isLoading && !query.data ? <div className="text-muted-foreground">未找到用户</div> : null}
        {query.data ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">手机号</div><div className="mt-1 font-medium">{query.data.phone}</div></div>
              <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">角色</div><Badge className="mt-1">{roleLabels[query.data.role]}</Badge></div>
              <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">最后登录</div><div className="mt-1">{query.data.last_login ?? '-'}</div></div>
              <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">登录 IP</div><div className="mt-1">{query.data.login_ip ?? '-'}</div></div>
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
              <Select className="w-40" options={roleOptions} value={query.data.role} onChange={(event) => roleMutation.mutate(event.target.value as Role)} />
              {query.data.is_blacklisted ? <Button variant="outline" onClick={() => setAction('unblacklist')}>解除拉黑</Button> : <Button variant="destructive" onClick={() => setAction('blacklist')}>拉黑用户</Button>}
              <Button variant="outline" onClick={() => setAction('forceLogout')}>强制登出</Button>
            </div>
          </div>
        ) : null}
      </CardContent>
      <ConfirmDialog open={action !== null} title="确认执行该操作？" onCancel={() => setAction(null)} onConfirm={handleConfirm} />
    </Card>
  )
}
