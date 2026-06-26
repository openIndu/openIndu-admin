import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { ACCESS_TOKEN_KEY, authApi, tokenStorage, type CurrentUser, type LoginResponse } from '@/api'

interface AuthContextValue {
  user: CurrentUser | null
  isAuthenticated: boolean
  isLoading: boolean
  loginWithResponse: (response: LoginResponse) => Promise<void>
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = tokenStorage.getAccessToken()
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const currentUser = await authApi.me()
      setUser(currentUser)
    } catch {
      setUser(null)
      tokenStorage.clear()
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  // Cross-tab logout sync: when another tab clears the access token (explicit
  // logout, or a failed refresh), drop this tab's session too and bounce to
  // login so the user isn't left looking at a stale, unauthenticated screen.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACCESS_TOKEN_KEY && e.newValue === null) {
        setUser(null)
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const loginWithResponse = useCallback(async (response: LoginResponse) => {
    tokenStorage.setTokens(response.access_token, response.refresh_token)
    if (response.user) {
      setUser(response.user)
      return
    }
    const currentUser = await authApi.me()
    setUser(currentUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // 本地退出优先，忽略服务端登出失败。
    } finally {
      tokenStorage.clear()
      setUser(null)
      window.location.href = '/login'
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user && tokenStorage.getAccessToken()),
    isLoading,
    loginWithResponse,
    refreshUser,
    logout,
  }), [isLoading, loginWithResponse, logout, refreshUser, user])

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内使用')
  }
  return context
}
