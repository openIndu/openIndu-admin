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
  series?: string
  description?: string
  file_size?: number
  download_count?: number
  sync_status?: 'pending' | 'syncing' | 'synced' | 'failed' | string
  is_published?: boolean
  upload_time?: string
  created_at?: string
}

export interface ResourceTag {
  id: number
  type: string
  value: string
  label_zh: string
  parent_value?: string
  brand_value?: string
  is_active: boolean
  sort_order: number
  created_at?: string
}

export interface SoftwareItem extends ResourceItem {
  latest_version?: string
  version?: string
  is_active?: boolean
  is_published?: boolean
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
      const detail = (error.response.data as { detail?: string })?.detail ?? ''
      if (detail) {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: detail, type: 'error' } }))
      }
      tokenStorage.clear()
      if (window.location.pathname !== '/login') {
        const isForceLogout = detail.includes('已被撤销') || detail.includes('强制登出')
        if (isForceLogout) {
          window.location.href = '/login?reason=force_logout&msg=' + encodeURIComponent(detail || 'Token 已被撤销，您已被强制退出')
        } else {
          window.location.href = '/login'
        }
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
  list: (params: { page?: number; size?: number; brand?: string; category?: string; series?: string; keyword?: string } = {}) => unwrap<PageResult<ResourceItem>>(api.get('/documents', { params })),
  upload: (formData: FormData) => unwrap<ResourceItem>(api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })),
  get: (id: number) => unwrap<ResourceItem>(api.get(`/documents/${id}`)),
  update: (id: number, data: Partial<Pick<ResourceItem, 'original_name' | 'brand' | 'category' | 'series' | 'description'>>) => unwrap<ResourceItem>(api.patch(`/documents/${id}`, data)),
  delete: (id: number) => unwrap(api.delete(`/documents/${id}`)),
  sync: (id: number) => unwrap<ResourceItem>(api.post(`/documents/${id}/sync`)),
  publishToggle: (id: number) => unwrap<ResourceItem>(api.patch(`/documents/${id}/publish`)),
  bulkPublish: (data: { ids?: number[]; brand?: string; category?: string; series?: string; keyword?: string; published_only?: boolean }) => unwrap<{ published_count: number }>(api.patch('/documents/publish/bulk', data)),
  brands: () => unwrap<Array<{ value: string; label: string }> | string[]>(api.get('/documents/brands/list')),
  categories: () => unwrap<Array<{ value: string; label: string }> | string[]>(api.get('/documents/categories/list')),
}

export const softwareApi = {
  list: (params: { page?: number; size?: number; brand?: string; category?: string; series?: string; keyword?: string } = {}) => unwrap<PageResult<SoftwareItem>>(api.get('/software', { params })),
  upload: (formData: FormData) => unwrap<SoftwareItem>(api.post('/software/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })),
  get: (id: number) => unwrap<SoftwareItem>(api.get(`/software/${id}`)),
  update: (id: number, data: Partial<Pick<SoftwareItem, 'original_name' | 'brand' | 'category' | 'series' | 'description'>>) => unwrap<SoftwareItem>(api.patch(`/software/${id}`, data)),
  delete: (id: number) => unwrap(api.delete(`/software/${id}`)),
  publishToggle: (id: number) => unwrap<SoftwareItem>(api.patch(`/software/${id}/publish`)),
  addVersion: (id: number, formData: FormData) => unwrap(api.post(`/software/${id}/versions`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })),
  deleteVersion: (id: number, versionId: number) => unwrap(api.delete(`/software/${id}/versions/${versionId}`)),
  categories: () => unwrap<Array<{ value: string; label: string }> | string[]>(api.get('/software/categories/list')),
}

export const tagsApi = {
  list: (type?: string, parent?: string, brand?: string) => unwrap<ResourceTag[]>(api.get('/tags', { params: { ...(type && { type }), ...(parent !== undefined && { parent }), ...(brand !== undefined && { brand }) } })),
  create: (data: { type: string; value: string; label_zh: string; parent_value?: string; brand_value?: string; sort_order?: number }) => unwrap<ResourceTag>(api.post('/tags', data)),
  update: (id: number, data: { label_zh?: string; is_active?: boolean; sort_order?: number }) => unwrap<ResourceTag>(api.patch(`/tags/${id}`, data)),
  remove: (id: number) => unwrap(api.delete(`/tags/${id}`)),
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

export interface DashboardStats {
  total_users: number
  total_docs: number
  total_software: number
  new_users_30d: number
  visitors_30d: number
  online_count: number
  online_visitors: number
  anonymous_online: number
  daily_registrations: Array<{ date: string; count: number }>
  daily_visitors: Array<{ date: string; count: number }>
  daily_logins: Array<{ date: string; count: number }>
  geo_distribution: Array<{
    name: string
    country_code?: string
    lat: number
    lng: number
    visitors: number
    registrations: number
    online: number
    anonymous: number
  }>
  // period stats (Asia/Shanghai timezone)
  current_active_users: number
  today_active_users: number
  today_new_users: number
  today_new_docs: number
  today_new_software: number
  month_active_users: number
  month_new_users: number
  month_new_docs: number
  month_new_software: number
  monthly_registrations: Array<{ date: string; count: number }>
  monthly_visitors: Array<{ date: string; count: number }>
}

export const statsApi = {
  online: () => unwrap<OnlineStats>(api.get('/stats/online')),
  dashboard: () => unwrap<DashboardStats>(api.get('/stats/dashboard')),
  loginHistory: (params: { page?: number; size?: number; keyword?: string; status?: string } = {}) => unwrap<PageResult<Record<string, unknown>>>(api.get('/stats/login-history', { params })),
}

export const adminApi = {
  auditLogs: (params: { page?: number; page_size?: number; admin_keyword?: string; target_keyword?: string; action?: string } = {}) =>
    api.get('/admin/audit-logs', { params }).then((r) => {
      const data = (r.data.data ?? r.data) as { items?: Record<string, unknown>[]; total?: number }
      return data
    }),
}

export const portalApi = {
  getHero: () => unwrap<Record<string, unknown>>(api.get('/portal/hero')),
  updateHero: (data: Record<string, unknown>) => unwrap<Record<string, unknown>>(api.put('/portal/hero', data)),
  getSolutions: () => unwrap<Record<string, unknown>[]>(api.get('/portal/solutions')),
  createSolution: (data: Record<string, unknown>) => unwrap<Record<string, unknown>>(api.post('/portal/solutions', data)),
  updateSolution: (id: number, data: Record<string, unknown>) => unwrap<Record<string, unknown>>(api.put(`/portal/solutions/${id}`, data)),
  deleteSolution: (id: number) => unwrap<boolean>(api.delete(`/portal/solutions/${id}`)),
  getCarousel: () => unwrap<Record<string, unknown>[]>(api.get('/portal/carousel')),
  uploadCarousel: (formData: FormData) => unwrap<Record<string, unknown>>(api.post('/portal/carousel', formData, { headers: { 'Content-Type': 'multipart/form-data' } })),
  updateCarousel: (id: number, data: Record<string, unknown>) => unwrap<Record<string, unknown>>(api.put(`/portal/carousel/${id}`, data)),
  deleteCarousel: (id: number) => unwrap<boolean>(api.delete(`/portal/carousel/${id}`)),
  getBenefits: () => unwrap<string[]>(api.get('/portal/benefits')),
  updateBenefits: (benefits: string[]) => unwrap<boolean>(api.put('/portal/benefits', benefits)),
  getFooter: () => unwrap<Record<string, unknown>>(api.get('/portal/footer')),
  updateFooter: (data: Record<string, unknown>) => unwrap<boolean>(api.put('/portal/footer', data)),
}
