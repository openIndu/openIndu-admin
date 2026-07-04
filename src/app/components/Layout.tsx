import { Outlet } from 'react-router'
import { LogOut, Menu, UserCircle } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { Button } from './ui/button'
import { Sidebar } from './Sidebar'
import { ToastContainer } from './Toast'
import { useState } from 'react'

export function Layout() {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar — always visible on md+ */}
      <Sidebar className="hidden md:flex" />
      {/* Mobile sidebar — overlay drawer */}
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} className="md:hidden" />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 md:h-16 items-center justify-between border-b bg-background px-4 md:px-6 gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              className="md:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-accent"
              onClick={() => setMobileOpen(true)}
              aria-label="打开菜单"
            >
              <Menu className="h-5 w-5" />
            </button>
            <img src="/assets/logo.png" alt="openIndu logo" className="h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-lg object-contain" />
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-semibold truncate">openIndu 社区管理平台</h1>
              <p className="hidden md:block text-sm text-muted-foreground">官网内容、用户、文档、软件与系统参数管理</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <div className="flex items-center gap-1.5 md:gap-2 rounded-lg border px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm">
              <UserCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">{user?.phone ?? '未知用户'}</span>
              <span className="sm:hidden">{user?.phone?.slice(-4) ?? '用户'}</span>
              <span className="text-muted-foreground hidden sm:inline">{user?.role ?? '-'}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">退出登录</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
