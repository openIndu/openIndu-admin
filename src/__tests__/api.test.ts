import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios, { type AxiosError } from 'axios'

// Mock import.meta.env
vi.stubEnv('VITE_API_BASE', '/api/v1')

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock axios
let requestInterceptor: ((config: any) => any) | null = null
let responseInterceptorSuccess: ((response: any) => any) | null = null
let responseInterceptorError: ((error: any) => any) | null = null

vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((success) => {
          requestInterceptor = success
        }),
      },
      response: {
        use: vi.fn((success, error) => {
          responseInterceptorSuccess = success
          responseInterceptorError = error
        }),
      },
    },
  }
  return { default: mockAxios }
})

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  describe('tokenStorage', () => {
    it('getAccessToken returns null when no token stored', async () => {
      const { tokenStorage } = await import('@/api')
      expect(tokenStorage.getAccessToken()).toBeNull()
    })

    it('getRefreshToken returns null when no token stored', async () => {
      const { tokenStorage } = await import('@/api')
      expect(tokenStorage.getRefreshToken()).toBeNull()
    })

    it('setTokens stores tokens in localStorage', async () => {
      const { tokenStorage } = await import('@/api')
      tokenStorage.setTokens('access-123', 'refresh-456')
      expect(tokenStorage.getAccessToken()).toBe('access-123')
      expect(tokenStorage.getRefreshToken()).toBe('refresh-456')
    })

    it('clear removes tokens from localStorage', async () => {
      const { tokenStorage } = await import('@/api')
      tokenStorage.setTokens('access-123', 'refresh-456')
      tokenStorage.clear()
      expect(tokenStorage.getAccessToken()).toBeNull()
      expect(tokenStorage.getRefreshToken()).toBeNull()
    })
  })

  describe('API interceptors', () => {
    it('adds Authorization header when token exists', async () => {
      const { tokenStorage } = await import('@/api')
      tokenStorage.setTokens('test-token', 'refresh-token')

      expect(requestInterceptor).toBeDefined()
      const config = { headers: {} }
      const result = requestInterceptor!(config)
      expect(result.headers.Authorization).toBe('Bearer test-token')
    })

    it('does not add Authorization header when no token', async () => {
      await import('@/api')
      const config = { headers: {} }
      const result = requestInterceptor!(config)
      expect(result.headers.Authorization).toBeUndefined()
    })

    it('passes through successful responses', async () => {
      await import('@/api')
      const response = { data: { code: 200, data: 'ok' } }
      const result = responseInterceptorSuccess!(response)
      expect(result).toEqual(response)
    })

    it('logs out and redirects on 401 when there is no refresh token', async () => {
      const { tokenStorage, ACCESS_TOKEN_KEY } = await import('@/api')
      localStorage.setItem(ACCESS_TOKEN_KEY, 'expired-token')

      const originalLocation = window.location
      delete (window as any).location
      window.location = { ...originalLocation, href: '/dashboard', pathname: '/dashboard' } as Location

      const error = {
        response: { status: 401 },
        config: { url: '/users', headers: {} },
      } as unknown as AxiosError

      await expect(responseInterceptorError!(error)).rejects.toBe(error)
      expect(tokenStorage.getAccessToken()).toBeNull()
      expect(window.location.href).toBe('/login')

      window.location = originalLocation
    })

    it('does not redirect if already on login page on 401', async () => {
      const { ACCESS_TOKEN_KEY } = await import('@/api')
      localStorage.setItem(ACCESS_TOKEN_KEY, 'expired-token')

      const originalLocation = window.location
      delete (window as any).location
      window.location = { ...originalLocation, href: '/login', pathname: '/login' } as Location

      const error = {
        response: { status: 401 },
        config: { url: '/users', headers: {} },
      } as unknown as AxiosError

      await expect(responseInterceptorError!(error)).rejects.toBe(error)
      expect(window.location.href).toBe('/login')

      window.location = originalLocation
    })

    it('rejects non-401 errors without redirect', async () => {
      await import('@/api')
      const error = {
        response: { status: 500 },
        config: { url: '/users', headers: {} },
      } as unknown as AxiosError
      await expect(responseInterceptorError!(error)).rejects.toEqual(error)
    })

    it('refreshes the token on 401, stores the rotated pair, and retries', async () => {
      const { tokenStorage } = await import('@/api')
      tokenStorage.setTokens('expired-token', 'valid-refresh')

      const mockedAxios = vi.mocked(axios)
      // rawRefresh -> axios.post(`${API_BASE}/auth/refresh`, ...) with the nested envelope
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          code: 200,
          data: {
            user: { id: 1, phone: '13800000000', role: 'admin' },
            tokens: { access_token: 'fresh-access', refresh_token: 'fresh-refresh' },
          },
        },
      })
      // retry of the original request after refresh
      mockedAxios.request.mockResolvedValueOnce({ data: { code: 200, data: 'retried' } })

      const error = {
        response: { status: 401 },
        config: { url: '/users', headers: {} },
      } as unknown as AxiosError

      await responseInterceptorError!(error)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/v1/auth/refresh',
        { refresh_token: 'valid-refresh' },
        { timeout: 30000 },
      )
      expect(tokenStorage.getAccessToken()).toBe('fresh-access')
      expect(tokenStorage.getRefreshToken()).toBe('fresh-refresh')
      expect(mockedAxios.request).toHaveBeenCalled()
    })

    it('logs out when the refresh endpoint itself returns 401', async () => {
      const { tokenStorage } = await import('@/api')
      tokenStorage.setTokens('expired-token', 'invalid-refresh')

      const originalLocation = window.location
      delete (window as any).location
      window.location = { ...originalLocation, href: '/dashboard', pathname: '/dashboard' } as Location

      const error = {
        response: { status: 401 },
        config: { url: '/api/v1/auth/refresh', headers: {} },
      } as unknown as AxiosError

      await expect(responseInterceptorError!(error)).rejects.toBe(error)
      expect(tokenStorage.getAccessToken()).toBeNull()
      expect(window.location.href).toBe('/login')

      window.location = originalLocation
    })
  })

  describe('normalizeLoginResponse', () => {
    it('normalizes nested login responses', async () => {
      // Access the private function by testing through authApi.login
      const mockedAxios = vi.mocked(axios)
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          code: 200,
          data: {
            user: { id: 1, phone: '13800000000', role: 'admin' },
            tokens: {
              access_token: 'access-token',
              refresh_token: 'refresh-token',
              token_type: 'bearer',
            },
          },
        },
      })

      const { authApi } = await import('@/api')
      const result = await authApi.login('13800000000', '888888')

      expect(result.access_token).toBe('access-token')
      expect(result.refresh_token).toBe('refresh-token')
      expect(result.user?.role).toBe('admin')
    })

    it('passes through flat login responses', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          code: 200,
          data: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            user: { id: 1, phone: '13800000000', role: 'admin' },
          },
        },
      })

      const { authApi } = await import('@/api')
      const result = await authApi.login('13800000000', '888888')

      expect(result.access_token).toBe('access-token')
      expect(result.refresh_token).toBe('refresh-token')
    })

    it('normalizes register responses with nested tokens', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          code: 200,
          data: {
            user: { id: 2, phone: '13900000000', role: 'user' },
            tokens: {
              access_token: 'reg-access',
              refresh_token: 'reg-refresh',
            },
          },
        },
      })

      const { authApi } = await import('@/api')
      const result = await authApi.register('13900000000', '888888')

      expect(result.access_token).toBe('reg-access')
      expect(result.refresh_token).toBe('reg-refresh')
    })
  })

  describe('unwrapItems helper', () => {
    it('extracts array directly when payload is array', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: 200,
          data: [{ config_key: 'key1', config_value: 'val1' }],
        },
      })

      const { configApi } = await import('@/api')
      const result = await configApi.list()
      expect(result).toEqual([{ config_key: 'key1', config_value: 'val1' }])
    })

    it('extracts items from wrapper when present', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: 200,
          data: {
            items: [{ config_key: 'key1', config_value: 'val1' }],
          },
        },
      })

      const { configApi } = await import('@/api')
      const result = await configApi.list()
      expect(result).toEqual([{ config_key: 'key1', config_value: 'val1' }])
    })

    it('returns empty array when items is not present', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          code: 200,
          data: {},
        },
      })

      const { configApi } = await import('@/api')
      const result = await configApi.list()
      expect(result).toEqual([])
    })
  })

  describe('configApi', () => {
    it('sends config updates using backend items/key/value schema', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.put.mockResolvedValueOnce({ data: { code: 200, data: {} } })

      const { configApi } = await import('@/api')
      await configApi.update([{ config_key: 'rag_chunk_size', config_value: '512' }])

      expect(mockedAxios.put).toHaveBeenCalledWith('/config', {
        items: [{ key: 'rag_chunk_size', value: '512' }],
      })
    })
  })

  describe('authApi methods', () => {
    it('sendCode calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.post.mockResolvedValueOnce({ data: { code: 200, data: true } })

      const { authApi } = await import('@/api')
      await authApi.sendCode('13800138000')

      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/send-code', { phone: '13800138000' })
    })

    it('refresh calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          code: 200,
          data: { access_token: 'new', refresh_token: 'new-refresh' },
        },
      })

      const { authApi } = await import('@/api')
      await authApi.refresh('old-refresh')

      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/refresh', { refresh_token: 'old-refresh' })
    })

    it('me calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({
        data: { code: 200, data: { id: 1, phone: '13800000000', role: 'admin' } },
      })

      const { authApi } = await import('@/api')
      await authApi.me()

      expect(mockedAxios.get).toHaveBeenCalledWith('/auth/me')
    })

    it('logout calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.post.mockResolvedValueOnce({ data: { code: 200, data: true } })

      const { authApi } = await import('@/api')
      await authApi.logout()

      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/logout')
    })
  })

  describe('userApi methods', () => {
    it('list calls correct endpoint with params', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({
        data: { code: 200, data: { items: [], total: 0, page: 1, size: 20 } },
      })

      const { userApi } = await import('@/api')
      await userApi.list({ page: 1, size: 10, keyword: 'test' })

      expect(mockedAxios.get).toHaveBeenCalledWith('/users', { params: { page: 1, size: 10, keyword: 'test' } })
    })

    it('list calls with empty params by default', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({
        data: { code: 200, data: { items: [], total: 0, page: 1, size: 20 } },
      })

      const { userApi } = await import('@/api')
      await userApi.list()

      expect(mockedAxios.get).toHaveBeenCalledWith('/users', { params: {} })
    })

    it('updateRole calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.put.mockResolvedValueOnce({ data: { code: 200, data: true } })

      const { userApi } = await import('@/api')
      await userApi.updateRole(1, 'admin')

      expect(mockedAxios.put).toHaveBeenCalledWith('/users/1/role', { role: 'admin' })
    })

    it('blacklist calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.post.mockResolvedValueOnce({ data: { code: 200, data: true } })

      const { userApi } = await import('@/api')
      await userApi.blacklist(1)

      expect(mockedAxios.post).toHaveBeenCalledWith('/users/1/blacklist')
    })

    it('unblacklist calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.post.mockResolvedValueOnce({ data: { code: 200, data: true } })

      const { userApi } = await import('@/api')
      await userApi.unblacklist(1)

      expect(mockedAxios.post).toHaveBeenCalledWith('/users/1/unblacklist')
    })

    it('forceLogout calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.post.mockResolvedValueOnce({ data: { code: 200, data: true } })

      const { userApi } = await import('@/api')
      await userApi.forceLogout(1)

      expect(mockedAxios.post).toHaveBeenCalledWith('/users/1/force-logout')
    })
  })

  describe('documentApi methods', () => {
    it('list calls correct endpoint with params', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({
        data: { code: 200, data: { items: [], total: 0, page: 1, size: 20 } },
      })

      const { documentApi } = await import('@/api')
      await documentApi.list({ page: 1, size: 10, brand: 'siemens', keyword: 'plc' })

      expect(mockedAxios.get).toHaveBeenCalledWith('/documents', { params: { page: 1, size: 10, brand: 'siemens', keyword: 'plc' } })
    })

    it('upload calls correct endpoint with FormData', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.post.mockResolvedValueOnce({ data: { code: 200, data: { id: 1, brand: 'siemens', category: 'plc' } } })

      const { documentApi } = await import('@/api')
      const formData = new FormData()
      await documentApi.upload(formData)

      expect(mockedAxios.post).toHaveBeenCalledWith('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 0, onUploadProgress: undefined })
    })

    it('get calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({ data: { code: 200, data: { id: 1, brand: 'siemens', category: 'plc' } } })

      const { documentApi } = await import('@/api')
      await documentApi.get(1)

      expect(mockedAxios.get).toHaveBeenCalledWith('/documents/1')
    })

    it('delete calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.delete.mockResolvedValueOnce({ data: { code: 200, data: true } })

      const { documentApi } = await import('@/api')
      await documentApi.delete(1)

      expect(mockedAxios.delete).toHaveBeenCalledWith('/documents/1')
    })

    it('brands calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({ data: { code: 200, data: ['siemens', 'omron'] } })

      const { documentApi } = await import('@/api')
      await documentApi.brands()

      expect(mockedAxios.get).toHaveBeenCalledWith('/documents/brands/list')
    })

    it('categories calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({ data: { code: 200, data: ['plc', 'hmi'] } })

      const { documentApi } = await import('@/api')
      await documentApi.categories()

      expect(mockedAxios.get).toHaveBeenCalledWith('/documents/categories/list')
    })
  })

  describe('softwareApi methods', () => {
    it('list calls correct endpoint with params', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({
        data: { code: 200, data: { items: [], total: 0, page: 1, size: 20 } },
      })

      const { softwareApi } = await import('@/api')
      await softwareApi.list({ page: 1, size: 10, brand: 'siemens' })

      expect(mockedAxios.get).toHaveBeenCalledWith('/software', { params: { page: 1, size: 10, brand: 'siemens' } })
    })

    it('upload calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.post.mockResolvedValueOnce({ data: { code: 200, data: { id: 1, brand: 'siemens', category: 'software' } } })

      const { softwareApi } = await import('@/api')
      const formData = new FormData()
      await softwareApi.upload(formData)

      expect(mockedAxios.post).toHaveBeenCalledWith('/software/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 0, onUploadProgress: undefined })
    })

    it('get calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({ data: { code: 200, data: { id: 1, brand: 'siemens', category: 'software' } } })

      const { softwareApi } = await import('@/api')
      await softwareApi.get(1)

      expect(mockedAxios.get).toHaveBeenCalledWith('/software/1')
    })

    it('delete calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.delete.mockResolvedValueOnce({ data: { code: 200, data: true } })

      const { softwareApi } = await import('@/api')
      await softwareApi.delete(1)

      expect(mockedAxios.delete).toHaveBeenCalledWith('/software/1')
    })

    it('addVersion calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.post.mockResolvedValueOnce({ data: { code: 200, data: true } })

      const { softwareApi } = await import('@/api')
      const formData = new FormData()
      await softwareApi.addVersion(1, formData)

      expect(mockedAxios.post).toHaveBeenCalledWith('/software/1/versions', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 0, onUploadProgress: undefined })
    })

    it('deleteVersion calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.delete.mockResolvedValueOnce({ data: { code: 200, data: true } })

      const { softwareApi } = await import('@/api')
      await softwareApi.deleteVersion(1, 2)

      expect(mockedAxios.delete).toHaveBeenCalledWith('/software/1/versions/2')
    })

    it('categories calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({ data: { code: 200, data: ['driver', 'utility'] } })

      const { softwareApi } = await import('@/api')
      await softwareApi.categories()

      expect(mockedAxios.get).toHaveBeenCalledWith('/software/categories/list')
    })
  })

  describe('portalApi methods', () => {
    it('getHero calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({ data: { code: 200, data: { title: 'Hero', subtitle: 'Sub' } } })

      const { portalApi } = await import('@/api')
      await portalApi.getHero()

      expect(mockedAxios.get).toHaveBeenCalledWith('/portal/hero')
    })

    it('updateHero calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.put.mockResolvedValueOnce({ data: { code: 200, data: { title: 'Hero', subtitle: 'Sub' } } })

      const { portalApi } = await import('@/api')
      await portalApi.updateHero({ title: 'Hero', subtitle: 'Sub', cta_text: 'CTA' })

      expect(mockedAxios.put).toHaveBeenCalledWith('/portal/hero', { title: 'Hero', subtitle: 'Sub', cta_text: 'CTA' })
    })

    it('getSolutions calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({ data: { code: 200, data: [] } })

      const { portalApi } = await import('@/api')
      await portalApi.getSolutions()

      expect(mockedAxios.get).toHaveBeenCalledWith('/portal/solutions')
    })

    it('createSolution calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.post.mockResolvedValueOnce({ data: { code: 200, data: { id: 1, title: 'Sol' } } })

      const { portalApi } = await import('@/api')
      await portalApi.createSolution({ title: 'Sol', description: 'Desc' })

      expect(mockedAxios.post).toHaveBeenCalledWith('/portal/solutions', { title: 'Sol', description: 'Desc' })
    })

    it('updateSolution calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.put.mockResolvedValueOnce({ data: { code: 200, data: { id: 1, title: 'Sol' } } })

      const { portalApi } = await import('@/api')
      await portalApi.updateSolution(1, { title: 'Updated' })

      expect(mockedAxios.put).toHaveBeenCalledWith('/portal/solutions/1', { title: 'Updated' })
    })

    it('deleteSolution calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.delete.mockResolvedValueOnce({ data: { code: 200, data: true } })

      const { portalApi } = await import('@/api')
      await portalApi.deleteSolution(1)

      expect(mockedAxios.delete).toHaveBeenCalledWith('/portal/solutions/1')
    })

    it('getCarousel calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({ data: { code: 200, data: [] } })

      const { portalApi } = await import('@/api')
      await portalApi.getCarousel()

      expect(mockedAxios.get).toHaveBeenCalledWith('/portal/carousel')
    })

    it('uploadCarousel calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.post.mockResolvedValueOnce({ data: { code: 200, data: { id: 1, image_url: 'url' } } })

      const { portalApi } = await import('@/api')
      const formData = new FormData()
      await portalApi.uploadCarousel(formData)

      expect(mockedAxios.post).toHaveBeenCalledWith('/portal/carousel', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    })

    it('updateCarousel calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.put.mockResolvedValueOnce({ data: { code: 200, data: { id: 1, image_url: 'url' } } })

      const { portalApi } = await import('@/api')
      await portalApi.updateCarousel(1, { image_url: 'new-url' })

      expect(mockedAxios.put).toHaveBeenCalledWith('/portal/carousel/1', { image_url: 'new-url' })
    })

    it('deleteCarousel calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.delete.mockResolvedValueOnce({ data: { code: 200, data: true } })

      const { portalApi } = await import('@/api')
      await portalApi.deleteCarousel(1)

      expect(mockedAxios.delete).toHaveBeenCalledWith('/portal/carousel/1')
    })

    it('getBenefits calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({ data: { code: 200, data: [] } })

      const { portalApi } = await import('@/api')
      await portalApi.getBenefits()

      expect(mockedAxios.get).toHaveBeenCalledWith('/portal/benefits')
    })

    it('updateBenefits calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.put.mockResolvedValueOnce({ data: { code: 200, data: true } })

      const { portalApi } = await import('@/api')
      await portalApi.updateBenefits(['benefit1'])

      expect(mockedAxios.put).toHaveBeenCalledWith('/portal/benefits', ['benefit1'])
    })

    it('getFooter calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({ data: { code: 200, data: {} } })

      const { portalApi } = await import('@/api')
      await portalApi.getFooter()

      expect(mockedAxios.get).toHaveBeenCalledWith('/portal/footer')
    })

    it('updateFooter calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.put.mockResolvedValueOnce({ data: { code: 200, data: true } })

      const { portalApi } = await import('@/api')
      await portalApi.updateFooter({ copyright: '2024' })

      expect(mockedAxios.put).toHaveBeenCalledWith('/portal/footer', { copyright: '2024' })
    })
  })

  describe('syncApi methods', () => {
    it('trigger calls correct endpoint with default mode', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.post.mockResolvedValueOnce({ data: { code: 200, data: true } })

      const { syncApi } = await import('@/api')
      await syncApi.trigger()

      expect(mockedAxios.post).toHaveBeenCalledWith('/sync/trigger', { mode: 'incremental' })
    })

    it('trigger calls correct endpoint with full mode', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.post.mockResolvedValueOnce({ data: { code: 200, data: true } })

      const { syncApi } = await import('@/api')
      await syncApi.trigger('full')

      expect(mockedAxios.post).toHaveBeenCalledWith('/sync/trigger', { mode: 'full' })
    })

    it('status calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({ data: { code: 200, data: {} } })

      const { syncApi } = await import('@/api')
      await syncApi.status()

      expect(mockedAxios.get).toHaveBeenCalledWith('/sync/status')
    })

    it('logs calls correct endpoint with params', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({
        data: { code: 200, data: { items: [], total: 0, page: 1, size: 20 } },
      })

      const { syncApi } = await import('@/api')
      await syncApi.logs({ page: 1, size: 10 })

      expect(mockedAxios.get).toHaveBeenCalledWith('/sync/logs', { params: { page: 1, size: 10 } })
    })
  })

  describe('statsApi methods', () => {
    it('online calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({ data: { code: 200, data: { online_users: 5 } } })

      const { statsApi } = await import('@/api')
      await statsApi.online()

      expect(mockedAxios.get).toHaveBeenCalledWith('/stats/online')
    })

    it('loginHistory calls correct endpoint', async () => {
      const mockedAxios = vi.mocked(axios)
      mockedAxios.get.mockResolvedValueOnce({
        data: { code: 200, data: { items: [], total: 0, page: 1, size: 20 } },
      })

      const { statsApi } = await import('@/api')
      await statsApi.loginHistory({ page: 1, size: 10 })

      expect(mockedAxios.get).toHaveBeenCalledWith('/stats/login-history', { params: { page: 1, size: 10 } })
    })
  })

  describe('API exports structure', () => {
    it('exports all expected API objects', async () => {
      const exports = await import('@/api')
      expect(exports.authApi).toBeDefined()
      expect(exports.userApi).toBeDefined()
      expect(exports.documentApi).toBeDefined()
      expect(exports.softwareApi).toBeDefined()
      expect(exports.portalApi).toBeDefined()
      expect(exports.configApi).toBeDefined()
      expect(exports.syncApi).toBeDefined()
      expect(exports.statsApi).toBeDefined()
      expect(exports.tokenStorage).toBeDefined()
      expect(exports.api).toBeDefined()
    })
  })
})
