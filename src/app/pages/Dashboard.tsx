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

  const W = 800
  const H = 240
  const padL = 44
  const padR = 16
  const padT = 16
  const padB = 32
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const max = Math.max(...data.map((d) => d.count), 1)

  const px = (i: number) => padL + (i / Math.max(data.length - 1, 1)) * innerW
  const py = (v: number) => padT + innerH - (v / max) * innerH

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(d.count).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${px(data.length - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${padL},${(padT + innerH).toFixed(1)} Z`
  const gradId = `grad-${id}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 240 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <line key={i} x1={padL} y1={(padT + innerH * (1 - f)).toFixed(1)} x2={padL + innerW} y2={(padT + innerH * (1 - f)).toFixed(1)} stroke="#e5e7eb" strokeWidth="1" />
      ))}
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => <circle key={i} cx={px(i).toFixed(1)} cy={py(d.count).toFixed(1)} r="4" fill={color} />)}
      <text x={padL - 4} y={padT + 4} textAnchor="end" fontSize="12" fill="#9ca3af">{max}</text>
      <text x={padL - 4} y={padT + innerH + 4} textAnchor="end" fontSize="12" fill="#9ca3af">0</text>
      {data.length > 0 && <text x={padL} y={H - 4} textAnchor="middle" fontSize="11" fill="#9ca3af">{data[0].date.slice(5)}</text>}
      {data.length > 1 && <text x={padL + innerW} y={H - 4} textAnchor="end" fontSize="11" fill="#9ca3af">{data[data.length - 1].date.slice(5)}</text>}
      {data.length > 2 && <text x={px(Math.floor((data.length - 1) / 2)).toFixed(1)} y={H - 4} textAnchor="middle" fontSize="11" fill="#9ca3af">{data[Math.floor((data.length - 1) / 2)].date.slice(5)}</text>}
    </svg>
  )
}

// Major global cities as reference landmarks (lat, lng, name)
const REFERENCE_CITIES: Array<[number, number, string]> = [
  [40.7, -74.0, '纽约'], [34.1, -118.2, '洛杉矶'], [41.9, -87.6, '芝加哥'],
  [51.5, -0.1, '伦敦'], [48.9, 2.3, '巴黎'], [52.5, 13.4, '柏林'], [55.8, 37.6, '莫斯科'],
  [39.9, 116.4, '北京'], [31.2, 121.5, '上海'], [35.7, 139.7, '东京'], [37.6, 127.0, '首尔'],
  [1.3, 103.8, '新加坡'], [19.1, 72.9, '孟买'], [25.2, 55.3, '迪拜'],
  [-23.5, -46.6, '圣保罗'], [-33.9, 151.2, '悉尼'], [6.5, 3.4, '拉各斯'], [-26.2, 28.0, '约翰内斯堡'],
]

function WorldMap({ data }: { data: DashboardStats['geo_distribution'] }) {
  const maxVal = Math.max(...data.map((g) => g.visitors + g.online), 1)

  // Mercator projection onto 1000x600 viewBox
  const project = (lat: number, lng: number): [number, number] => {
    const x = ((lng + 180) / 360) * 1000
    const latRad = (lat * Math.PI) / 180
    const mercY = Math.log(Math.tan(Math.PI / 4 + latRad / 2))
    const y = 300 - (mercY / Math.PI) * 300
    return [x, y]
  }

  // Simplified world continent outline
  const worldPath = [
    'M90,210 L140,155 L180,125 L220,105 L260,115 L270,140 L260,180 L230,200 L200,210 L160,230 L120,240 L90,235 L70,220 Z',
    'M180,290 L200,275 L220,280 L230,310 L225,350 L215,375 L195,380 L180,360 L175,325 L178,300 Z',
    'M440,140 L470,115 L510,110 L540,115 L560,135 L555,160 L540,175 L510,165 L485,160 L460,155 Z',
    'M450,215 L490,205 L540,210 L570,235 L575,280 L560,325 L530,350 L500,345 L470,320 L450,290 L445,255 Z',
    'M545,125 L600,100 L670,80 L740,85 L800,105 L860,130 L890,155 L870,185 L820,185 L760,175 L700,160 L650,160 L610,175 L580,168 L555,155 Z',
    'M740,200 L760,185 L790,190 L810,210 L800,235 L775,240 L750,230 Z',
    'M730,340 L760,320 L790,315 L820,325 L830,355 L810,380 L780,385 L750,375 L730,355 Z',
    'M850,135 L860,125 L870,130 L870,155 L860,162 L850,150 Z',
  ].join(' ')

  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-b from-slate-900 to-slate-950">
      <svg viewBox="0 0 1000 600" className="h-[500px] w-full">
        <defs>
          <radialGradient id="mapDotGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mapDotHot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </radialGradient>
          <filter id="mapGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Ocean background */}
        <rect width="1000" height="600" fill="#020617" />

        {/* Latitude / longitude grid */}
        {[0, 200, 400, 600, 800, 1000].map((x) => (
          <line key={`m-${x}`} x1={x} y1="0" x2={x} y2="600" stroke="#1e293b" strokeWidth="0.5" />
        ))}
        {[0, 150, 300, 450, 600].map((y) => (
          <line key={`p-${y}`} x1="0" y1={y} x2="1000" y2={y} stroke="#1e293b" strokeWidth="0.5" />
        ))}

        {/* Continents */}
        <path d={worldPath} fill="#0f172a" stroke="#1e293b" strokeWidth="1" opacity="0.8" />

        {/* Reference cities (subtle landmarks) */}
        {REFERENCE_CITIES.map(([lat, lng, name]) => {
          const [cx, cy] = project(lat, lng)
          return (
            <g key={`ref-${name}`} opacity="0.35">
              <circle cx={cx} cy={cy} r="2" fill="#64748b" />
              <text x={cx + 4} y={cy - 2} fontSize="8" fill="#64748b">{name}</text>
            </g>
          )
        })}

        {/* Live data points */}
        {data.map((geo) => {
          const [x, y] = project(geo.lat, geo.lng)
          const total = geo.visitors + geo.online
          const ratio = total / maxVal
          const isHot = ratio > 0.6
          const r = 8 + ratio * 24

          return (
            <g key={`data-${geo.name}-${geo.country_code ?? ''}`} filter="url(#mapGlow)">
              {/* Outer pulse */}
              <circle cx={x} cy={y} r={r * 1.6} fill={isHot ? 'url(#mapDotHot)' : 'url(#mapDotGlow)'} opacity="0.45" />
              {/* Main dot */}
              <circle cx={x} cy={y} r={r} fill={isHot ? '#f97316' : '#38bdf8'} opacity="0.9" />
              {/* Inner bright spot */}
              <circle cx={x} cy={y} r={Math.max(3.5, r * 0.3)} fill="#fff" opacity="0.95" />
              {/* Label above dot */}
              <text x={x} y={y - r - 7} textAnchor="middle" fontSize="10" fill="#e2e8f0" fontWeight="600">
                {geo.name}
              </text>
              {/* Visitor count below name */}
              <text x={x} y={y - r + 8} textAnchor="middle" fontSize="9" fill="#94a3b8">
                {total}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-6 border-t border-slate-800 px-5 py-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.5)]" />
          <span>常规访问</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]" />
          <span>热点区域（活跃度 &gt;60%）</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-500 opacity-60" />
          <span>参考城市</span>
        </div>
        <div className="ml-auto text-slate-500">圆点大小 = 活跃度 · 悬停查看详情</div>
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
            <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4 text-blue-600" />本月注册趋势</CardTitle>
            <CardDescription>本月每日新增注册用户数量（无数据日默认为 0）</CardDescription>
          </CardHeader>
          <CardContent>{dashQuery.isLoading ? <div className="text-muted-foreground text-sm">加载中...</div> : <LineChart data={d?.monthly_registrations ?? []} color="#3b82f6" id="reg" />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-emerald-600" />本月访问趋势</CardTitle>
            <CardDescription>本月每日登录用户访问去重统计（无数据日默认为 0）</CardDescription>
          </CardHeader>
          <CardContent>{dashQuery.isLoading ? <div className="text-muted-foreground text-sm">加载中...</div> : <LineChart data={d?.monthly_visitors ?? []} color="#10b981" id="visits" />}</CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-blue-500" />全球实时访问地图</CardTitle>
          <CardDescription>按 IP 地理位置展示最近 5 分钟访问分布，圆点大小表示活跃度。</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {dashQuery.isLoading ? <div className="text-muted-foreground text-sm">加载中...</div> : geoData.length === 0 ? <div className="py-12 text-center text-muted-foreground text-sm">暂无访问数据</div> : <WorldMap data={geoData} />}
          {geoData.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {geoData.slice(0, 6).map((geo) => (
                <div key={geo.name} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {geo.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{geo.name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" />访问 {geo.visitors}</span>
                      <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-400" />在线 {geo.online}</span>
                      <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-violet-400" />注册 {geo.registrations}</span>
                    </div>
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
