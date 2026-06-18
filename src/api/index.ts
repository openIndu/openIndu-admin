import axios, { type AxiosError } from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'
const ACCESS_TOKEN_KEY = 'openindu_admin_access_token'
const REFRESH_TOKEN_KEY = 'openindu_admin_refresh_token'

export type Role = 'user' | 'member' | 'admin'

export interface ApiResponse<T> {
  code: number
  message?: string
  detail?: string
  data: T
}

export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export interface CurrentUser {
  id: number
  phone: string
  role: Role
  is_active?: boolean
  is_blacklisted?: boolean
  last_login?: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type?: string
  user?: CurrentUser
}

interface NestedLoginResponse {
  user?: CurrentUser
  tokens?: LoginResponse & {
    expires_in?: number
    access_jti?: string
    refresh_jti?: string
    access_expires_at?: string
    refresh_expires_at?: string
  }
}

export interface UserItem extends CurrentUser {
  created_at?: string
  online?: boolean
  last_active_at?: string
  login_ip?: string
}

export interface ResourceItem {
  id: number
  filename?: string
  original_name?: string
  name?: string
  brand: string
  category: string
  file_size?: number
  download_count?: number
  sync_status?: 'pending' | 'syncing' | 'synced' | 'failed' | string
  upload_time?: string
  created_at?: string
}

export interface SoftwareItem extends ResourceItem {
  latest_version?: string
  version?: string
  is_active?: boolean
}

export interface SystemConfig {
  config_key: string
  config_value: string
  description?: string
  updated_at?: string
}

export interface SyncLog {
  id: number
  document_id?: number | null
  action: string
  status: string
  error_message?: string
  sync_time?: string
}

export interface OnlineStats {
  online_users: number
  geo_distribution?: Array<{ name: string; count: number }>
}

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
})

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      tokenStorage.clear()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

const unwrap = async <T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> => {
  const response = await promise
  return response.data.data
}

const unwrapItems = async <T>(promise: Promise<{ data: ApiResponse<T[] | { items?: T[] }> }>): Promise<T[]> => {
  const response = await promise
  const payload = response.data.data
  if (Array.isArray(payload)) return payload
  return payload.items ?? []
}

const normalizeLoginResponse = (payload: LoginResponse | NestedLoginResponse): LoginResponse => {
  if ('tokens' in payload && payload.tokens) {
    return {
      ...payload.tokens,
      user: payload.user,
    }
  }
  return payload as LoginResponse
}

export const authApi = {
  sendCode: (phone: string) => unwrap(api.post('/auth/send-code', { phone })),
  login: async (phone: string, code: string) => normalizeLoginResponse(await unwrap<LoginResponse | NestedLoginResponse>(api.post('/auth/login', { phone, code }))),
  register: async (phone: string, code: string) => normalizeLoginResponse(await unwrap<LoginResponse | NestedLoginResponse>(api.post('/auth/register', { phone, code }))),
  refresh: (refreshToken: string) => unwrap<LoginResponse>(api.post('/auth/refresh', { refresh_token: refreshToken })),
  me: () => unwrap<CurrentUser>(api.get('/auth/me')),
  logout: () => unwrap(api.post('/auth/logout')),
}

export const userApi = {
  list: (params: { page?: number; size?: number; keyword?: string } = {}) => unwrap<PageResult<UserItem>>(api.get('/users', { params })),
  updateRole: (id: number, role: Role) => unwrap(api.put(`/users/${id}/role`, { role })),
  blacklist: (id: number) => unwrap(api.post(`/users/${id}/blacklist`)),
  unblacklist: (id: number) => unwrap(api.post(`/users/${id}/unblacklist`)),
  forceLogout: (id: number) => unwrap(api.post(`/users/${id}/force-logout`)),
}

export const documentApi = {
  list: (params: { page?: number; size?: number; brand?: string; category?: string; keyword?: string } = {}) => unwrap<PageResult<ResourceItem>>(api.get('/documents', { params })),
  upload: (formData: FormData) => unwrap<ResourceItem>(api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })),
  get: (id: number) => unwrap<ResourceItem>(api.get(`/documents/${id}`)),
  delete: (id: number) => unwrap(api.delete(`/documents/${id}`)),
  brands: () => unwrap<Array<{ value: string; label: string }> | string[]>(api.get('/documents/brands/list')),
  categories: () => unwrap<Array<{ value: string; label: string }> | string[]>(api.get('/documents/categories/list')),
}

export const softwareApi = {
  list: (params: { page?: number; size?: number; brand?: string; category?: string; keyword?: string } = {}) => unwrap<PageResult<SoftwareItem>>(api.get('/software', { params })),
  upload: (formData: FormData) => unwrap<SoftwareItem>(api.post('/software/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })),
  get: (id: number) => unwrap<SoftwareItem>(api.get(`/software/${id}`)),
  delete: (id: number) => unwrap(api.delete(`/software/${id}`)),
  addVersion: (id: number, formData: FormData) => unwrap(api.post(`/software/${id}/versions`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })),
  deleteVersion: (id: number, versionId: number) => unwrap(api.delete(`/software/${id}/versions/${versionId}`)),
  categories: () => unwrap<Array<{ value: string; label: string }> | string[]>(api.get('/software/categories/list')),
}

export const configApi = {
  list: () => unwrapItems<SystemConfig>(api.get('/config')),
  update: (configs: Array<Pick<SystemConfig, 'config_key' | 'config_value'>>) => unwrap(api.put('/config', {
    items: configs.map((item) => ({ key: item.config_key, value: item.config_value })),
  })),
}

export const syncApi = {
  trigger: (mode: 'full' | 'incremental' = 'incremental') => unwrap(api.post('/sync/trigger', { mode })),
  status: () => unwrap<Record<string, unknown>>(api.get('/sync/status')),
  logs: (params: { page?: number; size?: number } = {}) => unwrap<PageResult<SyncLog>>(api.get('/sync/logs', { params })),
}

export const statsApi = {
  online: () => unwrap<OnlineStats>(api.get('/stats/online')),
  loginHistory: (params: { page?: number; size?: number } = {}) => unwrap<PageResult<Record<string, unknown>>>(api.get('/stats/login-history', { params })),
}
