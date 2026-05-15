export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`HTTP ${status}`)
    this.name = 'ApiError'
  }
}

export type PlanGateCode = 'SUBSCRIPTION_REQUIRED' | 'PLAN_UPGRADE_REQUIRED' | 'WALLET_LIMIT_REACHED' | 'PASS_LIMIT_REACHED'

const PLAN_GATE_CODES = new Set<string>(['SUBSCRIPTION_REQUIRED', 'PLAN_UPGRADE_REQUIRED', 'WALLET_LIMIT_REACHED', 'PASS_LIMIT_REACHED'])

class ApiClient {
  private readonly baseUrl: string
  private _accessToken: string | null = null
  onNoOrgContext?: () => void
  onPlanError?: (code: PlanGateCode, message: string) => void

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL ?? 'https://tribo-api-production.up.railway.app'
  }

  setToken(token: string): void {
    this._accessToken = token
  }

  clearToken(): void {
    this._accessToken = null
  }

  getToken(): string | null {
    return this._accessToken
  }

  urlFor(path: string): string {
    return `${this.baseUrl}${path}`
  }

  private async request<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
    const hasBody = init?.body !== undefined
    const isFormData = init?.body instanceof FormData
    const authHeader: Record<string, string> = this._accessToken
      ? { Authorization: `Bearer ${this._accessToken}` }
      : {}

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...authHeader,
        ...init?.headers,
      },
    })

    if (res.status === 401 && !isRetry) {
      const refreshed = await this._tryRefresh()
      if (refreshed) return this.request<T>(path, init, true)
      throw new ApiError(401, { error: 'UNAUTHORIZED' })
    }

    if (res.status === 429) {
      const data429 = await res.json().catch(() => null)
      throw new ApiError(429, data429)
    }

    if (res.status === 204) return undefined as T

    const data = await res.json().catch(() => null)

    if (res.status === 403) {
      const errorCode = (data as { error?: string })?.error ?? ''
      if (errorCode.includes('switch-org')) {
        this.onNoOrgContext?.()
        throw new ApiError(403, data)
      }
      if (PLAN_GATE_CODES.has(errorCode)) {
        this.onPlanError?.(errorCode as PlanGateCode, (data as { message?: string })?.message ?? '')
        throw new ApiError(403, data)
      }
    }

    if (!res.ok) throw new ApiError(res.status, data)

    return data as T
  }

  private async _tryRefresh(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) return false
      const data = await res.json().catch(() => null)
      if (data?.accessToken) {
        this._accessToken = data.accessToken
      }
      return true
    } catch {
      return false
    }
  }

  get<T>(path: string, headers?: Record<string, string>) {
    return this.request<T>(path, { headers })
  }

  post<T>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
    })
  }

  patch<T>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
    })
  }

  delete(path: string, headers?: Record<string, string>) {
    return this.request<void>(path, { method: 'DELETE', headers })
  }

  postFile<T>(path: string, formData: FormData) {
    return this.request<T>(path, { method: 'POST', body: formData })
  }
}

export const apiClient = new ApiClient()
