import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { FileText, MapPin, Settings, UploadCloud, Users, TrendingUp, UserPlus, Clock, CalendarDays } from 'lucide-react'
import { statsApi, type DashboardStats } from '@/api'
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
        <line key={i} x1={padL} y1={(padT + innerH * (1 - f)).toFixed(1)} x2={padL + innerW} y2={(padT + innerH * (1 - f)).toFixed(1)} stroke="#e5e7eb" strokeWidth="1" />
      ))}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => <circle key={i} cx={px(i).toFixed(1)} cy={py(d.count).toFixed(1)} r="2.5" fill={color} />)}
      <text x={padL - 3} y={padT + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{max}</text>
      <text x={padL - 3} y={padT + innerH + 4} textAnchor="end" fontSize="9" fill="#9ca3af">0</text>
      {data.length > 0 && <text x={padL} y={H - 4} textAnchor="middle" fontSize="8" fill="#9ca3af">{data[0].date.slice(5)}</text>}
      {data.length > 1 && <text x={padL + innerW} y={H - 4} textAnchor="end" fontSize="8" fill="#9ca3af">{data[data.length - 1].date.slice(5)}</text>}
      {data.length > 2 && <text x={px(Math.floor((data.length - 1) / 2)).toFixed(1)} y={H - 4} textAnchor="middle" fontSize="8" fill="#9ca3af">{data[Math.floor((data.length - 1) / 2)].date.slice(5)}</text>}
    </svg>
  )
}

function WorldMap({ data }: { data: DashboardStats['geo_distribution'] }) {
  const max = Math.max(...data.map((g) => g.visitors + g.online), 1)
  const project = (lat: number, lng: number) => ({
    x: ((lng + 180) / 360) * 100,
    y: ((90 - lat) / 180) * 100,
  })

  return (
    <div className="relative overflow-hidden rounded-xl border bg-slate-950 p-4 text-white">
      <svg viewBox="0 0 1000 500" className="h-[320px] w-full">
        <defs>
          <radialGradient id="mapPulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1000" height="500" fill="#020617" />
        {/* Simple world map silhouette */}
        <path d="M130 155 L210 120 L330 130 L350 190 L290 225 L215 215 L165 250 L95 220 Z" fill="#1e293b" opacity="0.9" />
        <path d="M250 245 L330 240 L360 305 L340 395 L285 455 L250 360 Z" fill="#1e293b" opacity="0.9" />
        <path d="M430 145 L530 110 L650 130 L705 195 L655 250 L520 235 L455 260 L395 215 Z" fill="#1e293b" opacity="0.9" />
        <path d="M505 250 L585 265 L620 335 L585 420 L525 395 L500 315 Z" fill="#1e293b" opacity="0.9" />
        <path d="M690 165 L820 150 L910 205 L865 285 L750 270 L700 220 Z" fill="#1e293b" opacity="0.9" />
        <path d="M780 325 L875 350 L895 415 L820 440 L760 395 Z" fill="#1e293b" opacity="0.9" />
        {[10, 30, 50, 70, 90].map((x) => <line key={`x-${x}`} x1={x * 10} y1="0" x2={x * 10} y2="500" stroke="#334155" strokeWidth="1" opacity="0.35" />)}
        {[20, 40, 60, 80].map((y) => <line key={`y-${y}`} x1="0" y1={y * 5} x2="1000" y2={y * 5} stroke="#334155" strokeWidth="1" opacity="0.35" />)}
        {data.map((geo) => {
          const p = project(geo.lat, geo.lng)
          const x = p.x * 10
          const y = p.y * 5
          const total = geo.visitors + geo.online
          const r = 7 + (total / max) * 18
          return (
            <g key={`${geo.name}-${geo.country_code ?? ''}`}>
              <circle cx={x} cy={y} r={r * 1.8} fill="url(#mapPulse)" opacity="0.35" />
              <circle cx={x} cy={y} r={r} fill="#38bdf8" opacity="0.85" />
              <circle cx={x} cy={y} r={Math.max(3, r * 0.35)} fill="#facc15" opacity="0.95" />
              <title>{`${geo.name} 访问:${geo.visitors} 在线:${geo.online} 未登录:${geo.anonymous} 注册:${geo.registrations}`}</title>
            </g>
          )
        })}
      </svg>
      <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-4">
        <div><span className="inline-block h-2 w-2 rounded-full bg-sky-400" /> 访问 IP</div>
        <div><span className="inline-block h-2 w-2 rounded-full bg-yellow-400" /> 在线用户</div>
        <div>未登录在线：按最近 5 分钟访问 IP - 登录在线估算</div>
        <div>Hover 点位可查看详情</div>
      </div>
    </div>
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

  const num = (v: number | undefined) => (dashQuery.isLoading ? '加载中' : dashQuery.isError ? '--' : (v ?? 0))

  const geoData = d?.geo_distribution ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">仪表盘</h2>
        <p className="text-muted-foreground">当前、今日与本月关键指标概览（Asia/Shanghai 时区）。</p>
      </div>

      {/* 当前情况 */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Clock className="h-4 w-4" />当前情况</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">当前访问人数</CardTitle>
              <Users className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.current_active_users)}</div>
              <p className="mt-1 text-xs text-muted-foreground">当前在线登录用户</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 今日情况 */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><CalendarDays className="h-4 w-4" />今日情况</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">今日访问人数</CardTitle>
              <Users className="h-4 w-4 text-sky-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.today_active_users)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">今日新增用户</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.today_new_users)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">今日新增文档</CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.today_new_docs)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">今日新增软件</CardTitle>
              <UploadCloud className="h-4 w-4 text-violet-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.today_new_software)}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 本月情况 */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><CalendarDays className="h-4 w-4" />本月情况</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">本月访问人数</CardTitle>
              <Users className="h-4 w-4 text-sky-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.month_active_users)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">本月新增用户</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.month_new_users)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">本月新增文档</CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.month_new_docs)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">本月新增软件</CardTitle>
              <UploadCloud className="h-4 w-4 text-violet-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.month_new_software)}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4 text-blue-600" />30 日注册趋势</CardTitle>
            <CardDescription>每日新增注册用户数量</CardDescription>
          </CardHeader>
          <CardContent>{dashQuery.isLoading ? <div className="text-muted-foreground text-sm">加载中...</div> : <LineChart data={d?.daily_registrations ?? []} color="#3b82f6" id="reg" />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-emerald-600" />30 日访问趋势</CardTitle>
            <CardDescription>每日访问 IP 去重统计（含未登录访问）</CardDescription>
          </CardHeader>
          <CardContent>{dashQuery.isLoading ? <div className="text-muted-foreground text-sm">加载中...</div> : <LineChart data={d?.daily_visitors ?? d?.daily_logins ?? []} color="#10b981" id="visits" />}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-blue-600" />全球实时访问地图</CardTitle>
          <CardDescription>按 IP 判断最近 5 分钟访问、注册、在线与未登录访问分布。</CardDescription>
        </CardHeader>
        <CardContent>
          {dashQuery.isLoading ? <div className="text-muted-foreground text-sm">加载中...</div> : geoData.length === 0 ? <div className="py-8 text-center text-muted-foreground text-sm">暂无访问数据</div> : <WorldMap data={geoData} />}
          {geoData.length > 0 && (
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {geoData.slice(0, 6).map((geo) => (
                <div key={geo.name} className="rounded-lg border p-3 text-sm">
                  <div className="font-medium">{geo.name}</div>
                  <div className="mt-1 grid grid-cols-2 gap-1 text-muted-foreground">
                    <span>访问 {geo.visitors}</span><span>注册 {geo.registrations}</span>
                    <span>在线 {geo.online}</span><span>未登录 {geo.anonymous}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>快捷入口</CardTitle><CardDescription>快速进入高频管理模块。</CardDescription></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.to} className="rounded-lg border p-4">
                <div className="flex items-center gap-2 font-medium"><Icon className="h-4 w-4 text-muted-foreground" />{item.label}</div>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                <Button asChild variant="outline" size="sm" className="mt-4"><Link to={item.to}>进入管理</Link></Button>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
