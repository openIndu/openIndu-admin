import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { FileText, MapPin, Settings, UploadCloud, Users } from 'lucide-react'
import { documentApi, softwareApi, statsApi, userApi } from '@/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'

const quickLinks = [
  { to: '/content/hero', label: '官网内容管理', description: '维护 Hero、解决方案和轮播图' },
  { to: '/users', label: '用户管理', description: '角色、拉黑、强制登出' },
  { to: '/documents', label: '文档管理', description: '上传、筛选、删除和同步' },
  { to: '/software', label: '软件管理', description: '软件包上传和版本维护' },
]

export function Dashboard() {
  const usersQuery = useQuery({ queryKey: ['dashboard', 'users'], queryFn: () => userApi.list({ page: 1, size: 1 }) })
  const onlineQuery = useQuery({ queryKey: ['dashboard', 'online'], queryFn: statsApi.online })
  const docsQuery = useQuery({ queryKey: ['dashboard', 'documents'], queryFn: () => documentApi.list({ page: 1, size: 1 }) })
  const softwareQuery = useQuery({ queryKey: ['dashboard', 'software'], queryFn: () => softwareApi.list({ page: 1, size: 1 }) })

  const stats = [
    { label: '总用户数', value: usersQuery.data?.total, icon: Users, loading: usersQuery.isLoading, error: usersQuery.isError },
    { label: '在线用户', value: onlineQuery.data?.online_users, icon: Users, loading: onlineQuery.isLoading, error: onlineQuery.isError },
    { label: '文档总数', value: docsQuery.data?.total, icon: FileText, loading: docsQuery.isLoading, error: docsQuery.isError },
    { label: '软件总数', value: softwareQuery.data?.total, icon: UploadCloud, loading: softwareQuery.isLoading, error: softwareQuery.isError },
  ]

  const geoDistribution = onlineQuery.data?.geo_distribution

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">仪表盘</h2>
        <p className="text-muted-foreground">查看平台运营概览和常用管理入口。</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{stat.loading ? '加载中' : stat.error ? '--' : stat.value ?? 0}</div>
                {stat.error ? <p className="mt-1 text-sm text-destructive">数据加载失败</p> : null}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {geoDistribution && geoDistribution.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              在线用户地理分布
            </CardTitle>
            <CardDescription>当前在线用户的地区分布统计。</CardDescription>
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
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>快捷入口</CardTitle>
          <CardDescription>快速进入高频管理模块。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {quickLinks.map((item) => (
            <div key={item.to} className="rounded-lg border p-4">
              <div className="font-medium">{item.label}</div>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to={item.to}>进入管理</Link>
              </Button>
            </div>
          ))}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 font-medium"><Settings className="h-4 w-4" />系统配置</div>
            <p className="mt-1 text-sm text-muted-foreground">维护 Embedding、分块和同步参数。</p>
            <Button asChild variant="outline" size="sm" className="mt-4"><Link to="/settings">进入配置</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
