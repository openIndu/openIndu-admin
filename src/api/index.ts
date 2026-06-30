import axios, { type AxiosError, type AxiosProgressEvent, type InternalAxiosRequestConfig } from 'axios'
import { getClientId } from '@/lib/clientIdentity'

// Large file uploads must not be capped by the default request timeout, and they
// expose an optional progress callback so the UI can render an upload bar.
const uploadConfig = (onUploadProgress?: (e: AxiosProgressEvent) => void) => ({
  headers: { 'Content-Type': 'multipart/form-data' },
  timeout: 0,
  onUploadProgress,
})

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'
export const ACCESS_TOKEN_KEY = 'openindu_admin_access_token'
export const REFRESH_TOKEN_KEY = 'openindu_admin_refresh_token'

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
  login_location?: string
  member_apply_status?: string
  member_apply_at?: string
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
  /** populated by /tags?type=<X> — number of documents/software currently using this tag */
  usage_count?: number
}

export interface SoftwareItem extends Omit<ResourceItem, 'series'> {
  latest_version?: string
  latest_version_size?: number
  versions_count?: number
  // Present when the list endpoint is called with expand_versions=true —
  // each row represents one version of a software package.
  version_id?: number
  version?: string
  is_latest_version?: boolean
  version_upload_time?: string
  version_download_count?: number
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
  document_name?: string | null
  action: string
  status: string
  error_message?: string
  sync_time?: string
}

export interface OnlineStats {
  online_users: number
  online_clients?: number
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
  const setHeader = (key: string, value: string) => {
    if (typeof config.headers.set === 'function') config.headers.set(key, value)
    else (config.headers as Record<string, string>)[key] = value
  }
  setHeader('X-OpenIndu-Client-Id', getClientId())
  const token = tokenStorage.getAccessToken()
  if (token) setHeader('Authorization', `Bearer ${token}`)
  return config
})

// The auth-refresh-aware response interceptor is registered further down, after
// normalizeLoginResponse is defined (it relies on it to parse the rotated pair).

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

// --- Token refresh orchestration ---------------------------------------
// The backend ROTATES refresh tokens: each /auth/refresh blacklists the
// presented refresh token's jti and returns a brand-new access+refresh pair.
// Concurrency is therefore dangerous — two refreshes with the same token mean
// the second hits a blacklisted jti and 401s. We guard with:
//   1. single-flight within a tab (isRefreshing + queue), and
//   2. cross-tab serialization via the Web Locks API, re-reading storage inside
//      the lock so a token another tab already rotated is reused, not rotated.
const AUTH_REFRESH_PATH = '/auth/refresh'

let isRefreshing = false
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

const flushQueue = (error: unknown, token: string | null) => {
  pendingQueue.forEach((p) => (error || !token ? p.reject(error) : p.resolve(token)))
  pendingQueue = []
}

const emitToast = (detail: string) => {
  if (detail) {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: detail, type: 'error' } }))
  }
}

const redirectToLogin = (detail = '') => {
  tokenStorage.clear()
  if (window.location.pathname !== '/login') {
    const isForceLogout = detail.includes('已被撤销') || detail.includes('强制登出')
    window.location.href = isForceLogout
      ? '/login?reason=force_logout&msg=' + encodeURIComponent(detail || 'Token 已被撤销，您已被强制退出')
      : '/login'
  }
}

// Bare axios (no interceptors) so a 401 from the refresh endpoint itself does
// not recurse back into this handler.
const rawRefresh = async (refreshToken: string): Promise<LoginResponse> => {
  const resp = await axios.post<ApiResponse<LoginResponse | NestedLoginResponse>>(
    `${API_BASE}${AUTH_REFRESH_PATH}`,
    { refresh_token: refreshToken },
    { timeout: 30_000 },
  )
  return normalizeLoginResponse(resp.data.data)
}

const withRefreshLock = <T>(fn: () => Promise<T>): Promise<T> => {
  const nav = navigator as Navigator & {
    locks?: { request?: (name: string, cb: () => Promise<T>) => Promise<T> }
  }
  if (typeof navigator !== 'undefined' && nav.locks?.request) {
    return nav.locks.request('openindu-admin-token-refresh', fn)
  }
  return fn()
}

// Runs the real refresh inside the cross-tab lock. `staleAccess` is the access
// token that just 401'd; if storage already holds a different one, another tab
// refreshed while we waited for the lock, so reuse it instead of rotating again.
const performRefresh = (staleAccess: string | null): Promise<string> =>
  withRefreshLock(async () => {
    const current = tokenStorage.getAccessToken()
    if (current && current !== staleAccess) return current
    const refreshToken = tokenStorage.getRefreshToken()
    if (!refreshToken) throw new Error('missing_refresh_token')
    const result = await rawRefresh(refreshToken)
    if (!result.access_token) throw new Error('refresh_failed')
    tokenStorage.setTokens(result.access_token, result.refresh_token ?? refreshToken)
    return result.access_token
  })

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const status = error.response?.status
    const detail = (error.response?.data as { detail?: string })?.detail ?? ''

    if (status !== 401 || !original) {
      return Promise.reject(error)
    }

    // 401 from the refresh endpoint itself → refresh token invalid → log out.
    if ((original.url ?? '').includes(AUTH_REFRESH_PATH)) {
      emitToast(detail)
      redirectToLogin(detail)
      return Promise.reject(error)
    }

    // Already retried once after a successful refresh and still 401 → give up.
    if (original._retry) {
      emitToast(detail)
      redirectToLogin(detail)
      return Promise.reject(error)
    }

    // No refresh token to spend → log out immediately.
    if (!tokenStorage.getRefreshToken()) {
      emitToast(detail)
      redirectToLogin(detail)
      return Promise.reject(error)
    }

    original._retry = true

    // A refresh is already in flight — queue, then retry with the fresh token.
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => pendingQueue.push({ resolve, reject })).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return api.request(original)
      })
    }

    isRefreshing = true
    const staleAccess = tokenStorage.getAccessToken()
    try {
      const newToken = await performRefresh(staleAccess)
      flushQueue(null, newToken)
      original.headers.Authorization = `Bearer ${newToken}`
      return api.request(original)
    } catch (refreshError) {
      flushQueue(refreshError, null)
      redirectToLogin(detail)
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export const authApi = {
  sendCode: (phone: string) => unwrap(api.post('/auth/send-code', { phone })),
  login: async (phone: string, code: string) => normalizeLoginResponse(await unwrap<LoginResponse | NestedLoginResponse>(api.post('/auth/login', { phone, code }))),
  register: async (phone: string, code: string) => normalizeLoginResponse(await unwrap<LoginResponse | NestedLoginResponse>(api.post('/auth/register', { phone, code }))),
  refresh: async (refreshToken: string) => normalizeLoginResponse(await unwrap<LoginResponse | NestedLoginResponse>(api.post('/auth/refresh', { refresh_token: refreshToken }))),
  me: () => unwrap<CurrentUser>(api.get('/auth/me')),
  logout: () => unwrap(api.post('/auth/logout')),
}

export const userApi = {
  list: (params: { page?: number; size?: number; keyword?: string; role?: string; apply_status?: string; sort_by?: string; sort_order?: 'asc' | 'desc' } = {}) => unwrap<PageResult<UserItem>>(api.get('/users', { params })),
  updateRole: (id: number, role: Role) => unwrap(api.put(`/users/${id}/role`, { role })),
  blacklist: (id: number) => unwrap(api.post(`/users/${id}/blacklist`)),
  unblacklist: (id: number) => unwrap(api.post(`/users/${id}/unblacklist`)),
  forceLogout: (id: number) => unwrap(api.post(`/users/${id}/force-logout`)),
  delete: (id: number) => unwrap(api.delete(`/users/${id}`)),
}

export const documentApi = {
  list: (params: { page?: number; size?: number; brand?: string; category?: string; series?: string; keyword?: string; sort_by?: string; sort_order?: 'asc' | 'desc' } = {}) => unwrap<PageResult<ResourceItem>>(api.get('/documents', { params })),
  upload: (formData: FormData, onUploadProgress?: (e: AxiosProgressEvent) => void) => unwrap<ResourceItem>(api.post('/documents/upload', formData, uploadConfig(onUploadProgress))),
  get: (id: number) => unwrap<ResourceItem>(api.get(`/documents/${id}`)),
  update: (id: number, data: Partial<Pick<ResourceItem, 'original_name' | 'brand' | 'category' | 'series' | 'description'>>) => unwrap<ResourceItem>(api.patch(`/documents/${id}`, data)),
  delete: (id: number) => unwrap(api.delete(`/documents/${id}`)),
  sync: (id: number) => unwrap<ResourceItem>(api.post(`/documents/${id}/sync`)),
  publishToggle: (id: number) => unwrap<ResourceItem>(api.patch(`/documents/${id}/publish`)),
  bulkPublish: (data: { ids?: number[]; brand?: string; category?: string; series?: string; keyword?: string; publish?: boolean }) => unwrap<{ count: number; publish: boolean }>(api.patch('/documents/publish/bulk', data)),
  downloadLink: (id: number) => unwrap<{ download_url: string; filename?: string; expires_in?: number }>(api.get(`/documents/${id}/download-link`)),
  brands: () => unwrap<Array<{ value: string; label: string }> | string[]>(api.get('/documents/brands/list')),
  categories: () => unwrap<Array<{ value: string; label: string }> | string[]>(api.get('/documents/categories/list')),
}

export interface SoftwareUploadInit {
  mode: 'sync' | 'single' | 'multipart'
  token?: string
  oss_key?: string
  part_size?: number
  part_urls?: string[]
  upload_url?: string
  expires_in?: number
}

export interface SoftwareUploadPart {
  part_number: number
  etag: string
}

export const softwareApi = {
  list: (params: { page?: number; size?: number; brand?: string; category?: string; keyword?: string; expand_versions?: boolean; sort_by?: string; sort_order?: 'asc' | 'desc' } = {}) => unwrap<PageResult<SoftwareItem>>(api.get('/software', { params })),
  upload: (formData: FormData, onUploadProgress?: (e: AxiosProgressEvent) => void) => unwrap<SoftwareItem>(api.post('/software/upload', formData, uploadConfig(onUploadProgress))),
  uploadInit: (meta: { filename: string; brand: string; category: string; version: string; description?: string; content_type?: string; size: number; software_id?: number }) =>
    unwrap<SoftwareUploadInit>(api.post('/software/upload/init', meta)),
  uploadComplete: (payload: { token: string; parts?: SoftwareUploadPart[]; file_hash?: string }) =>
    unwrap<SoftwareItem>(api.post('/software/upload/complete', payload)),
  uploadAbort: (token: string) => unwrap(api.post('/software/upload/abort', { token })),
  get: (id: number) => unwrap<SoftwareItem>(api.get(`/software/${id}`)),
  update: (id: number, data: Partial<Pick<SoftwareItem, 'original_name' | 'brand' | 'category' | 'description'>>) => unwrap<SoftwareItem>(api.patch(`/software/${id}`, data)),
  delete: (id: number) => unwrap(api.delete(`/software/${id}`)),
  publishToggle: (id: number) => unwrap<SoftwareItem>(api.patch(`/software/${id}/publish`)),
  publishVersionToggle: (id: number, versionId: number) => unwrap(api.patch(`/software/${id}/versions/${versionId}/publish`)),
  bulkPublish: (data: { ids?: number[]; version_ids?: number[]; brand?: string; category?: string; keyword?: string; publish?: boolean }) => unwrap<{ count: number; publish: boolean }>(api.patch('/software/publish/bulk', data)),
  addVersion: (id: number, formData: FormData, onUploadProgress?: (e: AxiosProgressEvent) => void) => unwrap(api.post(`/software/${id}/versions`, formData, uploadConfig(onUploadProgress))),
  deleteVersion: (id: number, versionId: number) => unwrap(api.delete(`/software/${id}/versions/${versionId}`)),
  downloadLink: (id: number) => unwrap<{ download_url: string; filename?: string; expires_in?: number }>(api.get(`/software/${id}/download-link`)),
  downloadVersionLink: (id: number, versionId: number) => unwrap<{ download_url: string; filename?: string; expires_in?: number }>(api.get(`/software/${id}/versions/${versionId}/download-link`)),
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
  total_visitors: number
  total_pv: number
  total_uv: number
  new_users_30d: number
  visitors_30d: number
  online_count: number
  online_clients?: number
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
  current_total_visitors: number
  current_5m_pv: number
  current_5m_uv: number
  today_active_users: number
  today_pv: number
  today_uv: number
  today_new_users: number
  today_new_docs: number
  today_new_software: number
  month_active_users: number
  month_pv: number
  month_uv: number
  month_new_users: number
  month_new_docs: number
  month_new_software: number
  monthly_registrations: Array<{ date: string; count: number }>
  monthly_visitors: Array<{ date: string; count: number }>
  monthly_pv: Array<{ date: string; count: number }>
  monthly_uv: Array<{ date: string; count: number }>
  monthly_anon_visitors: Array<{ date: string; count: number }>
  monthly_login_visitors: Array<{ date: string; count: number }>
  yearly_anon_visitors: Array<{ date: string; count: number }>
  yearly_visitors: Array<{ date: string; count: number }>
  yearly_pv: Array<{ date: string; count: number }>
  yearly_uv: Array<{ date: string; count: number }>
}

export const statsApi = {
  online: () => unwrap<OnlineStats>(api.get('/stats/online')),
  dashboard: () => unwrap<DashboardStats>(api.get('/stats/dashboard')),
  loginHistory: (params: { page?: number; size?: number; keyword?: string; status?: string } = {}) => unwrap<PageResult<Record<string, unknown>>>(api.get('/stats/login-history', { params })),
  visitLogs: (params: { page?: number; size?: number; keyword?: string; authed?: string; include_local?: boolean; sort_by?: string; sort_order?: 'asc' | 'desc' } = {}) => unwrap<PageResult<Record<string, unknown>>>(api.get('/stats/visit-logs', { params })),
  chatKnowledgeGaps: () => unwrap<{ disliked: KnowledgeGapItem[]; fallbacks: KnowledgeGapItem[] }>(api.get('/stats/chat/knowledge-gaps')),
}

export interface KnowledgeGapItem {
  message_id: number;
  session_id: number;
  question: string | null;
  answer_snippet?: string | null;
  mode?: string | null;
  created_at: string;
}

export const adminApi = {
  auditLogs: (params: { page?: number; page_size?: number; admin_keyword?: string; target_keyword?: string; action?: string; sort_by?: string; sort_order?: 'asc' | 'desc' } = {}) =>
    api.get('/admin/audit-logs', { params }).then((r) => {
      const data = (r.data.data ?? r.data) as { items?: Record<string, unknown>[]; total?: number }
      return data
    }),
}

export interface MemberApplicationItem {
  id: number
  user_id: number
  status: 'pending' | 'approved'
  note?: string
  reviewed_by?: number
  created_at?: string
  updated_at?: string
  phone?: string
  nickname?: string
  current_role?: string
}

export const memberApplicationApi = {
  list: (params: { page?: number; size?: number; status?: string; sort_by?: string; sort_order?: 'asc' | 'desc' } = {}) =>
    unwrap<{ items: MemberApplicationItem[]; total: number; page: number; size: number }>(
      api.get('/admin/member-applications', { params }),
    ),
  approve: (id: number) =>
    unwrap<MemberApplicationItem>(api.put(`/admin/member-applications/${id}/approve`)),
  reject: (id: number) =>
    unwrap<MemberApplicationItem>(api.put(`/admin/member-applications/${id}/reject`)),
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
