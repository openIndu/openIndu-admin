import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { FileText, MapPin, Settings, UploadCloud, Users, Wifi, TrendingUp, UserPlus } from 'lucide-react'
import { statsApi } from '@/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'

function LineChart({
  data,
  color = '#3b82f6',
  id = 'chart',
}: {
  data: Array<{ date: string; count: number }>
  color?: string
  id?: string
}) {
  if (!data.length) return <div className="py-8 text-center text-sm text-muted-foreground">暂无数据</div>

  const W = 400
  const H = 90
  const padL = 28
  const padR = 8
  const padT = 8
  const padB = 20
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const max = Math.max(...data.map((d) => d.count), 1)

  const px = (i: number) => padL + (i / Math.max(data.length - 1, 1)) * innerW
  const py = (v: number) => padT + innerH - (v / max) * innerH

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(d.count).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${px(data.length - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${padL},${(padT + innerH).toFixed(1)} Z`
  const gradId = `grad-${id}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f, i) => (
        <line
          key={i}
          x1={padL}
          y1={(padT + innerH * (1 - f)).toFixed(1)}
          x2={padL + innerW}
          y2={(padT + innerH * (1 - f)).toFixed(1)}
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={px(i).toFixed(1)} cy={py(d.count).toFixed(1)} r="2.5" fill={color} />
      ))}
      <text x={padL - 3} y={padT + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{max}</text>
      <text x={padL - 3} y={padT + innerH + 4} textAnchor="end" fontSize="9" fill="#9ca3af">0</text>
      {data.length > 0 && (
        <text x={padL} y={H - 4} textAnchor="middle" fontSize="8" fill="#9ca3af">
          {data[0].date.slice(5)}
        </text>
      )}
      {data.length > 1 && (
        <text x={padL + innerW} y={H - 4} textAnchor="end" fontSize="8" fill="#9ca3af">
          {data[data.length - 1].date.slice(5)}
        </text>
      )}
      {data.length > 2 && (
        <text
          x={px(Math.floor((data.length - 1) / 2)).toFixed(1)}
          y={H - 4}
          textAnchor="middle"
          fontSize="8"
          fill="#9ca3af"
        >
          {data[Math.floor((data.length - 1) / 2)].date.slice(5)}
        </text>
      )}
    </svg>
  )
}

const quickLinks = [
  { to: '/documents', label: '文档管理', description: '上传、筛选、删除和同步文档', icon: FileText },
  { to: '/software', label: '软件管理', description: '软件包上传和版本维护', icon: UploadCloud },
  { to: '/users', label: '用户管理', description: '角色、拉黑、强制登出', icon: Users },
  { to: '/settings', label: '系统配置', description: '维护 Embedding、分块和同步参数', icon: Settings },
]

export function Dashboard() {
  const dashQuery = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: statsApi.dashboard })
  const d = dashQuery.data

  const metrics = [
    { label: '当前在线', value: d?.online_count, icon: Wifi, color: 'text-emerald-600' },
    { label: '本月新增', value: d?.new_users_30d, icon: UserPlus, color: 'text-blue-600' },
    { label: '总用户数', value: d?.total_users, icon: Users, color: 'text-violet-600' },
    { label: '文档总数', value: d?.total_docs, icon: FileText, color: 'text-orange-600' },
  ]

  const geoData = d?.geo_distribution ?? []
  const geoMax = Math.max(...geoData.map((g) => g.count), 1)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">仪表盘</h2>
        <p className="text-muted-foreground">过去 30 天平台运营概览。</p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon
          return (
            <Card key={m.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
                <Icon className={`h-4 w-4 ${m.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {dashQuery.isLoading ? '加载中' : dashQuery.isError ? '--' : (d ? (m.value ?? 0) : 0)}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Trend charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-blue-600" />
              30 日注册趋势
            </CardTitle>
            <CardDescription>每日新增注册用户数量</CardDescription>
          </CardHeader>
          <CardContent>
            {dashQuery.isLoading ? (
              <div className="text-muted-foreground text-sm">加载中...</div>
            ) : (
              <LineChart data={d?.daily_registrations ?? []} color="#3b82f6" id="reg" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              30 日访问趋势
            </CardTitle>
            <CardDescription>每日活跃用户（登录会话）数量</CardDescription>
          </CardHeader>
          <CardContent>
            {dashQuery.isLoading ? (
              <div className="text-muted-foreground text-sm">加载中...</div>
            ) : (
              <LineChart data={d?.daily_logins ?? []} color="#10b981" id="logins" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Geo distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            实时在线地域分布
          </CardTitle>
          <CardDescription>当前在线用户的 IP 地域统计（共 {d?.online_count ?? 0} 人在线）</CardDescription>
        </CardHeader>
        <CardContent>
          {dashQuery.isLoading ? (
            <div className="text-muted-foreground text-sm">加载中...</div>
          ) : geoData.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">暂无在线用户</div>
          ) : (
            <div className="space-y-3">
              {geoData.slice(0, 12).map((geo) => (
                <div key={geo.name} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm text-right text-muted-foreground truncate" title={geo.name}>
                    {geo.name}
                  </span>
                  <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-sm transition-all"
                      style={{ width: `${(geo.count / geoMax) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-sm font-medium text-right">{geo.count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle>快捷入口</CardTitle>
          <CardDescription>快速进入高频管理模块。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.to} className="rounded-lg border p-4">
                <div className="flex items-center gap-2 font-medium">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link to={item.to}>进入管理</Link>
                </Button>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
