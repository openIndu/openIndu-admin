import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/store/auth'

export function AuthGuard() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">正在校验登录态...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-5xl">🚫</div>
          <h2 className="mb-2 text-xl font-semibold">权限不足</h2>
          <p className="mb-6 text-muted-foreground">该管理后台仅限管理员账号登录。</p>
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            onClick={() => { localStorage.clear(); window.location.href = '/login' }}
          >
            返回登录
          </button>
        </div>
      </div>
    )
  }

  return <Outlet />
}
