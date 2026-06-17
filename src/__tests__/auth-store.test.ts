import { describe, it, expect, vi, beforeEach } from 'vitest'

// Simulate actual tokenStorage behavior in mock
let storedAccessToken: string | null = null
let storedRefreshToken: string | null = null

vi.mock('@/api', () => ({
  authApi: {
    sendCode: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    refresh: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
  },
  tokenStorage: {
    getAccessToken: vi.fn(() => storedAccessToken),
    getRefreshToken: vi.fn(() => storedRefreshToken),
    setTokens: vi.fn((access: string, refresh: string) => {
      storedAccessToken = access
      storedRefreshToken = refresh
    }),
    clear: vi.fn(() => {
      storedAccessToken = null
      storedRefreshToken = null
    }),
  },
}))

import { authApi, tokenStorage } from '@/api'
import { AuthProvider, useAuth } from '@/store/auth'
import { createElement } from 'react'
import { renderHook, act } from '@testing-library/react'
import type { LoginResponse, CurrentUser } from '@/api'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(AuthProvider, null, children)

describe('Auth Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storedAccessToken = null
    storedRefreshToken = null
  })

  describe('useAuth', () => {
    it('throws error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth())
      }).toThrow('useAuth 必须在 AuthProvider 内使用')
    })

    it('returns isLoading false and not authenticated when no token stored', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
    })

    it('sets user and isAuthenticated on loginWithResponse with user in response', async () => {
      const mockResponse: LoginResponse = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        user: {
          id: 1,
          phone: '13800138000',
          role: 'admin',
        },
      }

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.loginWithResponse(mockResponse)
      })

      expect(tokenStorage.setTokens).toHaveBeenCalledWith('access-token-123', 'refresh-token-456')
      expect(result.current.user).toEqual({
        id: 1,
        phone: '13800138000',
        role: 'admin',
      })
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('fetches user via me() when loginWithResponse has no user field', async () => {
      const mockUser: CurrentUser = {
        id: 2,
        phone: '13900139000',
        role: 'member',
      }
      vi.mocked(authApi.me).mockResolvedValueOnce(mockUser)

      const mockResponse: LoginResponse = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
      }

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.loginWithResponse(mockResponse)
      })

      expect(authApi.me).toHaveBeenCalled()
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('logout clears tokens and redirects', async () => {
      vi.mocked(authApi.logout).mockResolvedValueOnce(undefined)

      const originalLocation = window.location
      delete (window as any).location
      window.location = { ...originalLocation, href: '' } as Location

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.logout()
      })

      expect(tokenStorage.clear).toHaveBeenCalled()
      expect(window.location.href).toBe('/login')

      window.location = originalLocation
    })

    it('logout clears tokens even if API call fails', async () => {
      vi.mocked(authApi.logout).mockRejectedValueOnce(new Error('Network error'))

      const originalLocation = window.location
      delete (window as any).location
      window.location = { ...originalLocation, href: '' } as Location

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.logout()
      })

      expect(tokenStorage.clear).toHaveBeenCalled()
      expect(window.location.href).toBe('/login')

      window.location = originalLocation
    })

    it('refreshUser sets user when token is valid', async () => {
      const mockUser: CurrentUser = {
        id: 3,
        phone: '13700137000',
        role: 'user',
      }
      storedAccessToken = 'valid-token'
      vi.mocked(authApi.me).mockResolvedValueOnce(mockUser)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('refreshUser clears tokens and sets user to null when API fails', async () => {
      storedAccessToken = 'invalid-token'
      vi.mocked(authApi.me).mockRejectedValueOnce(new Error('Unauthorized'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(tokenStorage.clear).toHaveBeenCalled()
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('refreshUser sets isLoading false immediately when no token', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })
})
