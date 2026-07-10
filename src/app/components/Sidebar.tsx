import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  FileText,
  MessageSquare,
  Settings,
  Shield,
  SlidersHorizontal,
  Tag,
  UploadCloud,
  Users,
  X,
} from 'lucide-react'
import { cn } from './ui/utils'
import { Sheet, SheetContent } from './ui/sheet'

const mainNavItems = [
  { to: '/dashboard', label: '仪表盘', icon: BarChart3, end: true },
  { to: '/documents', label: '文档管理', icon: FileText },
  { to: '/software', label: '软件管理', icon: UploadCloud },
  { to: '/users', label: '用户管理', icon: Users, end: true },
]

const settingsSubItems = [
  { to: '/settings', label: '配置管理', icon: Settings, end: true },
  { to: '/settings/tags', label: '品牌与分类', icon: Tag },
  { to: '/stats', label: '访问日志', icon: Clock, end: true },
  { to: '/stats/audit', label: '审计日志', icon: Shield },
  { to: '/stats/chat-gaps', label: '知识盲区', icon: MessageSquare },
]

export function Sidebar({ mobileOpen = false, onMobileClose, className }: {
  mobileOpen?: boolean
  onMobileClose?: () => void
  className?: string
}) {
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

  const closeMobile = () => onMobileClose?.()

  // Auto-close mobile drawer on navigation
  useEffect(() => {
    closeMobile()
  }, [location.pathname])

  const inner = (
    <>
      {/* Logo / Brand */}
      <div
        className={cn(
          'flex items-center border-b',
          collapsed ? 'justify-center px-3 py-5' : 'gap-2 px-4 py-5',
        )}
      >
        {!collapsed && (
          <>
            <img
              src="/assets/logo.png"
              alt="openIndu logo"
              className="h-10 w-10 shrink-0 rounded-lg object-contain"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xl font-semibold">openIndu</div>
              <div className="text-sm text-muted-foreground">社区管理平台</div>
            </div>
          </>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title={collapsed ? '展开菜单' : '收起菜单'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
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
    </>
  )

  // ── Mobile: Sheet overlay drawer from left ──
  if (onMobileClose) {
    return (
      <Sheet open={mobileOpen} onOpenChange={(open) => { if (!open) closeMobile() }}>
        <SheetContent side="left" className="w-64 max-w-[85vw] p-0 bg-sidebar text-sidebar-foreground border-r">
          <button
            onClick={closeMobile}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex h-full flex-col">
            {inner}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // ── Desktop: inline sidebar ──
  return (
    <aside
      className={cn(
        'relative flex h-screen shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
        className,
      )}
    >
      {inner}
    </aside>
  )
}
