import { Outlet } from 'react-router'
import { LogOut, UserCircle } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { Button } from './ui/button'
import { Sidebar } from './Sidebar'

export function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-background px-6">
          <div className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="openIndu logo" className="h-9 w-9 rounded-lg object-contain" />
            <div>
              <h1 className="text-lg font-semibold">openIndu 社区管理平台</h1>
              <p className="text-sm text-muted-foreground">官网内容、用户、文档、软件与系统参数管理</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <UserCircle className="h-4 w-4" />
              <span>{user?.phone ?? '未知用户'}</span>
              <span className="text-muted-foreground">{user?.role ?? '-'}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              退出登录
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
