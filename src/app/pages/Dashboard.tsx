import { useState } from 'react'
import type { MouseEvent } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { FileText, Settings, UploadCloud, Users, TrendingUp, UserPlus, Clock, CalendarDays } from 'lucide-react'
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { statsApi, type DashboardStats } from '@/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'

const WORLD_TOPO = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const COUNTRY_ZH: Record<string, string> = {
  'China': '中国', 'United States': '美国', 'Japan': '日本', 'South Korea': '韩国',
  'United Kingdom': '英国', 'France': '法国', 'Germany': '德国', 'Russia': '俄罗斯',
  'India': '印度', 'Brazil': '巴西', 'Canada': '加拿大', 'Australia': '澳大利亚',
  'Italy': '意大利', 'Spain': '西班牙', 'Mexico': '墨西哥', 'Indonesia': '印尼',
  'Netherlands': '荷兰', 'Turkey': '土耳其', 'Saudi Arabia': '沙特', 'Switzerland': '瑞士',
  'Sweden': '瑞典', 'Poland': '波兰', 'Belgium': '比利时', 'Argentina': '阿根廷',
  'Austria': '奥地利', 'Iran': '伊朗', 'Thailand': '泰国', 'South Africa': '南非',
  'Nigeria': '尼日利亚', 'Egypt': '埃及', 'Vietnam': '越南', 'Philippines': '菲律宾',
  'Malaysia': '马来西亚', 'Pakistan': '巴基斯坦', 'Colombia': '哥伦比亚', 'Chile': '智利',
  'Peru': '秘鲁', 'Ukraine': '乌克兰', 'Czechia': '捷克', 'Portugal': '葡萄牙',
  'Greece': '希腊', 'Israel': '以色列', 'U.A.E.': '阿联酋', 'Singapore': '新加坡',
  'Denmark': '丹麦', 'Finland': '芬兰', 'Ireland': '爱尔兰', 'New Zealand': '新西兰',
  'Hungary': '匈牙利', 'Romania': '罗马尼亚', 'Bangladesh': '孟加拉国', 'Morocco': '摩洛哥',
  'Kazakhstan': '哈萨克斯坦', 'Kenya': '肯尼亚', 'Ethiopia': '埃塞俄比亚', 'Ghana': '加纳',
  'Venezuela': '委内瑞拉', 'Cuba': '古巴', 'Algeria': '阿尔及利亚', 'Iraq': '伊拉克',
  'Syria': '叙利亚', 'Qatar': '卡塔尔', 'Myanmar': '缅甸', 'Afghanistan': '阿富汗',
  'North Korea': '朝鲜', 'Taiwan': '台湾', 'Sri Lanka': '斯里兰卡', 'Nepal': '尼泊尔',
  'Cambodia': '柬埔寨', 'Libya': '利比亚', 'Tunisia': '突尼斯', 'Angola': '安哥拉',
  'Zimbabwe': '津巴布韦', 'Tanzania': '坦桑尼亚', 'Uganda': '乌干达', 'Sudan': '苏丹',
  'S. Sudan': '南苏丹', 'Dem. Rep. Congo': '刚果(金)', 'Congo': '刚果(布)', 'Cameroon': '喀麦隆',
  'Mozambique': '莫桑比克', 'Madagascar': '马达加斯加', 'Zambia': '赞比亚', 'Malawi': '马拉维',
  'Senegal': '塞内加尔', 'Mali': '马里', 'Niger': '尼日尔', 'Burkina Faso': '布基纳法索',
  'Chad': '乍得', 'Somalia': '索马里', 'Eritrea': '厄立特里亚', 'Rwanda': '卢旺达',
  'Burundi': '布隆迪', 'Botswana': '博茨瓦纳', 'Namibia': '纳米比亚', 'Mauritania': '毛里塔尼亚',
  'Liberia': '利比里亚', 'Sierra Leone': '塞拉利昂', 'Guinea': '几内亚', 'Gabon': '加蓬',
  'Togo': '多哥', 'Benin': '贝宁', 'C.A.R.': '中非', 'Eq. Guinea': '赤道几内亚',
  'Croatia': '克罗地亚', 'Slovakia': '斯洛伐克', 'Slovenia': '斯洛文尼亚', 'Serbia': '塞尔维亚',
  'Bosnia and Herz.': '波黑', 'Bulgaria': '保加利亚', 'Albania': '阿尔巴尼亚', 'Moldova': '摩尔多瓦',
  'Lithuania': '立陶宛', 'Latvia': '拉脱维亚', 'Estonia': '爱沙尼亚', 'Belarus': '白俄罗斯',
  'Mongolia': '蒙古', 'Uzbekistan': '乌兹别克斯坦', 'Turkmenistan': '土库曼斯坦',
  'Kyrgyzstan': '吉尔吉斯斯坦', 'Tajikistan': '塔吉克斯坦', 'Georgia': '格鲁吉亚',
  'Armenia': '亚美尼亚', 'Azerbaijan': '阿塞拜疆', 'Cyprus': '塞浦路斯', 'Luxembourg': '卢森堡',
  'Iceland': '冰岛', 'Malta': '马耳他', 'Oman': '阿曼', 'Yemen': '也门', 'Jordan': '约旦',
  'Lebanon': '黎巴嫩', 'Kuwait': '科威特', 'Bahrain': '巴林', 'Laos': '老挝',
  'Brunei': '文莱', 'Timor-Leste': '东帝汶', 'Papua New Guinea': '巴布亚新几内亚',
  'Fiji': '斐济', 'Solomon Is.': '所罗门群岛', 'Vanuatu': '瓦努阿图', 'Jamaica': '牙买加',
  'Haiti': '海地', 'Dominican Rep.': '多米尼加', 'Puerto Rico': '波多黎各', 'Trinidad and Tobago': '特立尼达',
  'Panama': '巴拿马', 'Costa Rica': '哥斯达黎加', 'Nicaragua': '尼加拉瓜', 'Honduras': '洪都拉斯',
  'El Salvador': '萨尔瓦多', 'Guatemala': '危地马拉', 'Belize': '伯利兹', 'Uruguay': '乌拉圭',
  'Paraguay': '巴拉圭', 'Bolivia': '玻利维亚', 'Ecuador': '厄瓜多尔', 'Guyana': '圭亚那',
  'Suriname': '苏里南', 'Fr. Guiana': '法属圭亚那', 'W. Sahara': '西撒哈拉',
  // Exact world-atlas (countries-110m) names — keep keys matching geo.properties.name.
  'United States of America': '美国', 'United Arab Emirates': '阿联酋', 'Central African Rep.': '中非',
  'Norway': '挪威', 'Greenland': '格陵兰', 'Kosovo': '科索沃', 'Montenegro': '黑山', 'Macedonia': '北马其顿',
  'Palestine': '巴勒斯坦', 'N. Cyprus': '北塞浦路斯', 'Bahamas': '巴哈马', 'Bhutan': '不丹',
  "Côte d'Ivoire": '科特迪瓦', 'Djibouti': '吉布提', 'Gambia': '冈比亚', 'Guinea-Bissau': '几内亚比绍',
  'Lesotho': '莱索托', 'eSwatini': '斯威士兰', 'Somaliland': '索马里兰', 'Falkland Is.': '福克兰群岛',
  'New Caledonia': '新喀里多尼亚', 'Antarctica': '南极洲', 'Fr. S. Antarctic Lands': '法属南方领地',
}

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
      {data.map((d, i) => (
        // Visible dot + an invisible larger hit-target so the native <title>
        // tooltip is easy to trigger even on dense or zero-value series.
        <g key={i}>
          <circle cx={px(i).toFixed(1)} cy={py(d.count).toFixed(1)} r="4" fill={color} />
          <circle cx={px(i).toFixed(1)} cy={py(d.count).toFixed(1)} r="10" fill="transparent" style={{ cursor: 'pointer' }}>
            <title>{d.date}：{d.count}</title>
          </circle>
        </g>
      ))}
      <text x={padL - 4} y={padT + 4} textAnchor="end" fontSize="12" fill="#9ca3af">{max}</text>
      <text x={padL - 4} y={padT + innerH + 4} textAnchor="end" fontSize="12" fill="#9ca3af">0</text>
      {data.length > 0 && <text x={padL} y={H - 4} textAnchor="middle" fontSize="11" fill="#9ca3af">{data[0].date.slice(5)}</text>}
      {data.length > 1 && <text x={padL + innerW} y={H - 4} textAnchor="end" fontSize="11" fill="#9ca3af">{data[data.length - 1].date.slice(5)}</text>}
      {data.length > 2 && <text x={px(Math.floor((data.length - 1) / 2)).toFixed(1)} y={H - 4} textAnchor="middle" fontSize="11" fill="#9ca3af">{data[Math.floor((data.length - 1) / 2)].date.slice(5)}</text>}
    </svg>
  )
}

const REFERENCE_CITIES: Array<[number, number, string]> = [
  // North America (13)
  [40.7, -74.0, '纽约'], [34.1, -118.2, '洛杉矶'], [41.9, -87.6, '芝加哥'],
  [37.8, -122.4, '旧金山'], [43.7, -79.4, '多伦多'], [19.4, -99.1, '墨西哥城'],
  [29.8, -95.4, '休斯顿'], [33.4, -112.1, '凤凰城'], [47.6, -122.3, '西雅图'],
  [25.8, -80.2, '迈阿密'], [38.9, -77.0, '华盛顿'], [42.4, -71.1, '波士顿'],
  [45.5, -73.6, '蒙特利尔'],
  // South America (9)
  [-23.5, -46.6, '圣保罗'], [-34.6, -58.4, '布宜诺斯'], [-12.0, -77.0, '利马'],
  [4.7, -74.1, '波哥大'], [-33.4, -70.7, '圣地亚哥'], [10.5, -66.9, '加拉加斯'],
  [-16.5, -68.1, '拉巴斯'], [-0.2, -78.5, '基多'], [-3.1, -60.0, '马瑙斯'],
  // Europe (18)
  [51.5, -0.1, '伦敦'], [48.9, 2.3, '巴黎'], [52.5, 13.4, '柏林'], [55.8, 37.6, '莫斯科'],
  [41.9, 12.5, '罗马'], [40.4, -3.7, '马德里'], [52.4, 4.9, '阿姆斯特丹'],
  [48.2, 16.4, '维也纳'], [52.2, 21.0, '华沙'], [59.3, 18.1, '斯德哥尔摩'],
  [55.7, 12.6, '哥本哈根'], [50.1, 14.4, '布拉格'], [47.5, 19.0, '布达佩斯'],
  [38.7, -9.1, '里斯本'], [50.5, 30.5, '基辅'], [37.9, 23.7, '雅典'],
  [44.4, 26.1, '布加勒斯特'], [53.3, -6.3, '都柏林'],
  // Africa (15)
  [30.0, 31.2, '开罗'], [6.5, 3.4, '拉各斯'], [-26.2, 28.0, '约翰内斯堡'], [-1.3, 36.8, '内罗毕'],
  [33.6, -7.6, '卡萨布兰卡'], [-33.9, 18.4, '开普敦'], [36.8, 10.2, '突尼斯'],
  [14.7, -17.5, '达喀尔'], [5.6, -0.2, '阿克拉'], [9.0, 7.5, '阿布贾'],
  [3.4, -76.5, '卡利'], [-4.3, 15.3, '金沙萨'], [-8.8, 13.2, '罗安达'],
  [15.6, 32.5, '喀土穆'], [9.0, 38.7, '亚的斯亚贝巴'],
  // Middle East (10)
  [25.2, 55.3, '迪拜'], [35.7, 51.4, '德黑兰'], [21.4, 39.8, '吉达'],
  [31.9, 35.9, '安曼'], [33.3, 44.4, '巴格达'], [33.5, 36.3, '大马士革'],
  [24.7, 46.7, '利雅得'], [31.2, 29.9, '亚历山大'], [15.3, 44.2, '萨那'],
  [23.6, 58.6, '马斯喀特'],
  // South Asia (8)
  [19.1, 72.9, '孟买'], [28.6, 77.2, '新德里'], [22.6, 88.4, '加尔各答'],
  [13.1, 80.3, '钦奈'], [23.0, 72.6, '艾哈迈达巴德'], [33.7, 73.0, '伊斯兰堡'],
  [24.9, 67.1, '卡拉奇'], [23.8, 90.4, '达卡'],
  // East & Southeast Asia (19)
  [39.9, 116.4, '北京'], [31.2, 121.5, '上海'], [22.3, 114.2, '香港'],
  [35.7, 139.7, '东京'], [37.6, 127.0, '首尔'], [1.3, 103.8, '新加坡'],
  [13.8, 100.5, '曼谷'], [14.6, 121.0, '马尼拉'], [-6.2, 106.8, '雅加达'],
  [30.6, 104.1, '成都'], [23.1, 113.3, '广州'], [34.3, 108.9, '西安'],
  [21.0, 105.8, '河内'], [10.8, 106.7, '胡志明'], [3.1, 101.7, '吉隆坡'],
  [16.8, 96.1, '仰光'], [27.7, 85.3, '加德满都'], [25.0, 121.5, '台北'],
  [34.7, 135.5, '大阪'],
  // Oceania (5)
  [-33.9, 151.2, '悉尼'], [-37.8, 145.0, '墨尔本'], [-27.5, 153.0, '布里斯班'],
  [-31.9, 115.9, '珀斯'], [41.3, 174.8, '惠灵顿'],
  // Central Asia (3)
  [43.2, 76.9, '阿拉木图'], [41.3, 69.2, '塔什干'], [38.6, 68.8, '杜尚别'],
]

function WorldMap({ data }: { data: DashboardStats['geo_distribution'] }) {
  // Filter out 本地开发 and 未知 — dev self-traffic and unresolved IPs would
  // otherwise sit at fake centroids (Shanghai / mid-Atlantic) and skew the map.
  const realData = data.filter((g) => g.name !== '本地开发' && g.name !== '未知')
  const maxVal = Math.max(...realData.map((g) => g.visitors + g.online), 1)
  // Marker radius tiered by the total count's share of the busiest region, so a
  // glance at the map conveys volume without needing the tooltip.
  const tierRadius = (total: number) => {
    const ratio = total / maxVal
    if (ratio >= 0.6) return 6
    if (ratio >= 0.3) return 4.5
    if (ratio >= 0.1) return 3.5
    return 2.5
  }
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null)

  return (
    <div className="relative overflow-hidden rounded-xl border bg-[#d4dfe6]">
      <div className="h-[650px] w-full">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 180, center: [15, 15] }}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup zoom={1} minZoom={1} maxZoom={1} translateExtent={[[0, 0], [800, 500]]}>
            {/* Ocean — natural blue */}
            <rect x={-1000} y={-800} width={2800} height={2400} fill="#a8c8e8" />

            {/* Country boundaries — green-tan landmasses */}
            <Geographies geography={WORLD_TOPO}>
              {({ geographies }: { geographies: Array<{ rsmKey: string; properties: { name: string; name_zh?: string } }> }) =>
                geographies.map((geo: { rsmKey: string; properties: { name: string; name_zh?: string } }) => {
                  const cn = COUNTRY_ZH[geo.properties.name]
                  const label = cn ? `${cn} (${geo.properties.name})` : geo.properties.name
                  return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#e8dec8"
                    stroke="#c0b898"
                    strokeWidth={0.6}
                    onMouseEnter={(evt: MouseEvent) => {
                      setTooltip({ name: label, x: evt.clientX, y: evt.clientY })
                    }}
                    onMouseMove={(evt: MouseEvent) => {
                      setTooltip({ name: label, x: evt.clientX, y: evt.clientY })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      default: { outline: 'none' },
                      hover: {
                        fill: '#f0e8d0',
                        stroke: '#a09878',
                        strokeWidth: 1,
                        outline: 'none',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                      },
                      pressed: { outline: 'none' },
                    }}
                  />
                  )
                })
              }
            </Geographies>

            {/* Reference cities — subtle dots */}
            {REFERENCE_CITIES.map(([lat, lng, name]) => (
              <Marker key={`ref-${name}`} coordinates={[lng, lat]}>
                <circle r={1.5} fill="#5a4a3a" opacity={0.4} />
                <text
                  textAnchor="start"
                  x={4}
                  y={-2}
                  style={{ fontFamily: 'system-ui', fontSize: 7.5, fill: '#5a4a3a', opacity: 0.5, fontWeight: 400 }}
                >
                  {name}
                </text>
              </Marker>
            ))}

            {/* Live data markers — radius tiered by count; hover to see region + count */}
            {realData.map((geo) => {
              const total = geo.visitors + geo.online
              const isHot = total / maxVal >= 0.6
              const label = `${geo.name}：${total} 次访问`
              return (
                <Marker key={`data-${geo.name}-${geo.country_code ?? ''}`} coordinates={[geo.lng, geo.lat]}>
                  <circle
                    cx={0}
                    cy={0}
                    r={tierRadius(total)}
                    fill={isHot ? '#ef4444' : '#2563eb'}
                    stroke="#fff"
                    strokeWidth={0.5}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(evt: MouseEvent) => setTooltip({ name: label, x: evt.clientX, y: evt.clientY })}
                    onMouseMove={(evt: MouseEvent) => setTooltip({ name: label, x: evt.clientX, y: evt.clientY })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                </Marker>
              )
            })}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Country tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded bg-slate-800 px-2.5 py-1 text-xs text-white shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 28 }}
        >
          {tooltip.name}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 border-t border-[#b8c8d8] bg-[#e8edf2] px-4 py-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-600" /> 蓝点=常规访问</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> 红点=热点区域</span>
        <span className="flex items-center gap-1 text-slate-400">圆点越大 = 访问量越高</span>
        <span className="ml-auto text-slate-400">已隐藏本地开发与未知；悬停查看访问量</span>
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
  const visibleGeoCount = geoData.filter((g) => g.name !== '本地开发' && g.name !== '未知').length

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
              <CardTitle className="text-sm font-medium text-muted-foreground">当前总访问人数</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.current_total_visitors)}</div>
              <p className="mt-1 text-xs text-muted-foreground">过去 5 分钟活跃访客 IP（匿名 + 登录）</p>
            </CardContent>
          </Card>
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
              <p className="mt-1 text-xs text-muted-foreground">今日去重访客 IP（匿名 + 登录）</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">今日新增用户</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.today_new_users)}</div>
              <p className="mt-1 text-xs text-muted-foreground">今日新注册用户</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">今日新增文档</CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.today_new_docs)}</div>
              <p className="mt-1 text-xs text-muted-foreground">今日上传文档数</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">今日新增软件</CardTitle>
              <UploadCloud className="h-4 w-4 text-violet-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.today_new_software)}</div>
              <p className="mt-1 text-xs text-muted-foreground">今日上传软件数</p>
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
              <p className="mt-1 text-xs text-muted-foreground">本月去重访客 IP（匿名 + 登录）</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">本月新增用户</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.month_new_users)}</div>
              <p className="mt-1 text-xs text-muted-foreground">本月新注册用户</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">本月新增文档</CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.month_new_docs)}</div>
              <p className="mt-1 text-xs text-muted-foreground">本月上传文档数</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">本月新增软件</CardTitle>
              <UploadCloud className="h-4 w-4 text-violet-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.month_new_software)}</div>
              <p className="mt-1 text-xs text-muted-foreground">本月上传软件数</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 总情况 */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><TrendingUp className="h-4 w-4" />总情况</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总会员人数</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.total_users)}</div>
              <p className="mt-1 text-xs text-muted-foreground">累计注册用户数</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总文档</CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.total_docs)}</div>
              <p className="mt-1 text-xs text-muted-foreground">累计已入库文档总数</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总软件</CardTitle>
              <UploadCloud className="h-4 w-4 text-violet-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{num(d?.total_software)}</div>
              <p className="mt-1 text-xs text-muted-foreground">累计已入库软件总数</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-sky-600" />本月匿名访问趋势</CardTitle>
            <CardDescription>本月每日匿名访问去重 IP（无数据日默认为 0）</CardDescription>
          </CardHeader>
          <CardContent>{dashQuery.isLoading ? <div className="text-muted-foreground text-sm">加载中...</div> : <LineChart data={d?.monthly_anon_visitors ?? []} color="#0ea5e9" id="anon-month" />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-emerald-600" />本月登录访问趋势</CardTitle>
            <CardDescription>本月每日登录用户访问去重数（无数据日默认为 0）</CardDescription>
          </CardHeader>
          <CardContent>{dashQuery.isLoading ? <div className="text-muted-foreground text-sm">加载中...</div> : <LineChart data={d?.monthly_login_visitors ?? []} color="#10b981" id="login-month" />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4 text-blue-600" />本月注册趋势</CardTitle>
            <CardDescription>本月每日新增注册用户数量（无数据日默认为 0）</CardDescription>
          </CardHeader>
          <CardContent>{dashQuery.isLoading ? <div className="text-muted-foreground text-sm">加载中...</div> : <LineChart data={d?.monthly_registrations ?? []} color="#3b82f6" id="reg" />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-amber-600" />过去一年匿名+登录访问趋势</CardTitle>
            <CardDescription>过去 12 个月每月匿名+登录访问去重 IP（按月聚合）</CardDescription>
          </CardHeader>
          <CardContent>{dashQuery.isLoading ? <div className="text-muted-foreground text-sm">加载中...</div> : <LineChart data={d?.yearly_visitors ?? []} color="#f59e0b" id="year-all" />}</CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-rose-600" />访问地域分布</CardTitle>
          <CardDescription>本月匿名访问 + 登录用户的访问人数地理分布（按访客所在地汇总）</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {dashQuery.isLoading ? <div className="p-6 text-muted-foreground text-sm">加载中...</div> : visibleGeoCount === 0 ? <div className="py-12 text-center text-muted-foreground text-sm">暂无访问数据</div> : <WorldMap data={geoData} />}
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
