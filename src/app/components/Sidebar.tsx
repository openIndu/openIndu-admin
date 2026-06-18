import { useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  FileText,
  Settings,
  Shield,
  SlidersHorizontal,
  UploadCloud,
  Users,
} from 'lucide-react'
import { cn } from './ui/utils'

const mainNavItems = [
  { to: '/dashboard', label: '仪表盘', icon: BarChart3 },
  { to: '/documents', label: '文档管理', icon: FileText },
  { to: '/software', label: '软件管理', icon: UploadCloud },
  { to: '/users', label: '用户管理', icon: Users },
]

const settingsSubItems = [
  { to: '/settings', label: '配置管理', icon: Settings },
  { to: '/stats', label: '登录日志', icon: Clock, end: true },
  { to: '/stats/audit', label: '审计日志', icon: Shield },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(true)
  const location = useLocation()
  const isSettingsActive =
    location.pathname.startsWith('/settings') || location.pathname.startsWith('/stats')

  const linkClass = (isActive: boolean) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      collapsed && 'justify-center',
      isActive &&
        'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground',
    )

  return (
    <aside
      className={cn(
        'relative flex h-screen shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo / Brand */}
      <div
        className={cn(
          'flex items-center border-b',
          collapsed ? 'justify-center px-3 py-5' : 'gap-3 px-6 py-5',
        )}
      >
        <img
          src="/assets/logo.png"
          alt="openIndu logo"
          className="h-10 w-10 shrink-0 rounded-lg object-contain"
        />
        {!collapsed && (
          <div>
            <div className="text-xl font-semibold">openIndu</div>
            <div className="text-sm text-muted-foreground">社区管理平台</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => linkClass(isActive)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          )
        })}

        {/* Settings group */}
        {collapsed ? (
          settingsSubItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                className={({ isActive }) => linkClass(isActive)}
              >
                <Icon className="h-4 w-4 shrink-0" />
              </NavLink>
            )
          })
        ) : (
          <div>
            <button
              onClick={() => setSettingsOpen((o) => !o)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isSettingsActive && 'font-medium text-sidebar-primary',
              )}
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">系统配置</span>
              {settingsOpen ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {settingsOpen && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-2">
                {settingsSubItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => linkClass(isActive)}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </NavLink>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center border-t py-3 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        title={collapsed ? '展开菜单' : '收起菜单'}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <>
            <ChevronLeft className="mr-2 h-4 w-4" />
            <span className="text-xs">收起</span>
          </>
        )}
      </button>
    </aside>
  )
}
