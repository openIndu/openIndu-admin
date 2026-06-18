import { useState } from 'react'
import { NavLink } from 'react-router'
import { BarChart3, ChevronLeft, ChevronRight, Clock, FileText, Settings, Shield, UploadCloud, Users } from 'lucide-react'
import { cn } from './ui/utils'

const navItems = [
  { to: '/dashboard', label: '仪表盘', icon: BarChart3 },
  { to: '/stats', label: '登录日志', icon: Clock },
  { to: '/stats/audit', label: '审计日志', icon: Shield },
  { to: '/documents', label: '文档管理', icon: FileText },
  { to: '/software', label: '软件管理', icon: UploadCloud },
  { to: '/users', label: '用户管理', icon: Users },
  { to: '/settings', label: '系统配置', icon: Settings },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn(
      'relative flex h-screen shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200',
      collapsed ? 'w-16' : 'w-64',
    )}>
      {/* Logo / Brand */}
      <div className={cn('flex items-center border-b', collapsed ? 'justify-center px-3 py-5' : 'gap-3 px-6 py-5')}>
        <img src="/assets/logo.png" alt="openIndu logo" className="h-10 w-10 shrink-0 rounded-lg object-contain" />
        {!collapsed && (
          <div>
            <div className="text-xl font-semibold">openIndu</div>
            <div className="text-sm text-muted-foreground">社区管理平台</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/stats'}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center',
                isActive && 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center border-t py-3 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        title={collapsed ? '展开菜单' : '收起菜单'}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4 mr-2" /><span className="text-xs">收起</span></>}
      </button>
    </aside>
  )
}
