import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/store/auth'

export function AdminGuard() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">正在加载权限...</div>
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
