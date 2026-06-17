import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

// Mock axios
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }
  return { default: mockAxios }
})

// We need to import after mocking
// The api module uses import.meta.env which won't work in vitest without setup
// Let's test the core logic patterns instead

describe('API Client Structure', () => {
  it('exports authApi with expected methods', async () => {
    const { authApi } = await import('@/api')
    expect(authApi).toBeDefined()
    expect(typeof authApi.sendCode).toBe('function')
    expect(typeof authApi.login).toBe('function')
    expect(typeof authApi.register).toBe('function')
    expect(typeof authApi.refresh).toBe('function')
    expect(typeof authApi.me).toBe('function')
    expect(typeof authApi.logout).toBe('function')
  })

  it('exports userApi with expected methods', async () => {
    const { userApi } = await import('@/api')
    expect(userApi).toBeDefined()
    expect(typeof userApi.list).toBe('function')
    expect(typeof userApi.updateRole).toBe('function')
    expect(typeof userApi.blacklist).toBe('function')
    expect(typeof userApi.unblacklist).toBe('function')
    expect(typeof userApi.forceLogout).toBe('function')
  })

  it('exports documentApi with expected methods', async () => {
    const { documentApi } = await import('@/api')
    expect(documentApi).toBeDefined()
    expect(typeof documentApi.list).toBe('function')
    expect(typeof documentApi.upload).toBe('function')
    expect(typeof documentApi.get).toBe('function')
    expect(typeof documentApi.delete).toBe('function')
    expect(typeof documentApi.brands).toBe('function')
    expect(typeof documentApi.categories).toBe('function')
  })

  it('exports softwareApi with expected methods', async () => {
    const { softwareApi } = await import('@/api')
    expect(softwareApi).toBeDefined()
    expect(typeof softwareApi.list).toBe('function')
    expect(typeof softwareApi.upload).toBe('function')
    expect(typeof softwareApi.get).toBe('function')
    expect(typeof softwareApi.delete).toBe('function')
  })

  it('exports portalApi with expected methods', async () => {
    const { portalApi } = await import('@/api')
    expect(portalApi).toBeDefined()
    expect(typeof portalApi.getHero).toBe('function')
    expect(typeof portalApi.updateHero).toBe('function')
    expect(typeof portalApi.getSolutions).toBe('function')
  })

  it('exports configApi with expected methods', async () => {
    const { configApi } = await import('@/api')
    expect(configApi).toBeDefined()
    expect(typeof configApi.list).toBe('function')
    expect(typeof configApi.update).toBe('function')
  })

  it('exports syncApi with expected methods', async () => {
    const { syncApi } = await import('@/api')
    expect(syncApi).toBeDefined()
    expect(typeof syncApi.trigger).toBe('function')
    expect(typeof syncApi.status).toBe('function')
    expect(typeof syncApi.logs).toBe('function')
  })

  it('exports statsApi with expected methods', async () => {
    const { statsApi } = await import('@/api')
    expect(statsApi).toBeDefined()
    expect(typeof statsApi.online).toBe('function')
  })

  it('exports tokenStorage with expected methods', async () => {
    const { tokenStorage } = await import('@/api')
    expect(tokenStorage).toBeDefined()
    expect(typeof tokenStorage.getAccessToken).toBe('function')
    expect(typeof tokenStorage.getRefreshToken).toBe('function')
    expect(typeof tokenStorage.setTokens).toBe('function')
    expect(typeof tokenStorage.clear).toBe('function')
  })
})

describe('configApi response normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes config list responses with items wrapper', async () => {
    const mockedAxios = vi.mocked(axios)
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          items: [
            { config_key: 'embedding_model', config_value: 'BAAI/bge-m3' },
          ],
        },
      },
    })

    const { configApi } = await import('@/api')
    const result = await configApi.list()

    expect(result).toEqual([{ config_key: 'embedding_model', config_value: 'BAAI/bge-m3' }])
  })

  it('sends config updates using backend items/key/value schema', async () => {
    const mockedAxios = vi.mocked(axios)
    mockedAxios.put.mockResolvedValueOnce({ data: { code: 200, data: { items: [] } } })

    const { configApi } = await import('@/api')
    await configApi.update([{ config_key: 'rag_chunk_size', config_value: '512' }])

    expect(mockedAxios.put).toHaveBeenCalledWith('/config', {
      items: [{ key: 'rag_chunk_size', value: '512' }],
    })
  })
})

describe('authApi login normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes backend login responses with nested tokens', async () => {
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
})

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

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
