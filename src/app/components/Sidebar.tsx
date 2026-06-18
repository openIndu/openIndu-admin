import { NavLink } from 'react-router'
import { BarChart3, FileText, Image, Settings, Shield, UploadCloud, Users } from 'lucide-react'
import { cn } from './ui/utils'

const navItems = [
  { to: '/dashboard', label: '仪表盘', icon: BarChart3 },
  { to: '/content/solutions', label: '官网内容', icon: Image },
  { to: '/users', label: '用户管理', icon: Users },
  { to: '/documents', label: '文档管理', icon: FileText },
  { to: '/software', label: '软件管理', icon: UploadCloud },
  { to: '/settings', label: '系统配置', icon: Settings },
  { to: '/stats', label: '在线统计', icon: BarChart3 },
  { to: '/stats/audit', label: '审计日志', icon: Shield },
]

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="border-b px-6 py-5">
        <div className="flex items-center gap-3">
          <img src="/assets/logo.png" alt="openIndu logo" className="h-10 w-10 rounded-lg object-contain" />
          <div>
            <div className="text-xl font-semibold">openIndu</div>
            <div className="text-sm text-muted-foreground">社区管理平台</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/stats'}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive && 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
